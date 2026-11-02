import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { successResponse } from "../../api-response.js";
import { getAuthConfig } from "../../config/env.js";
import { db } from "../../db/index.js";
import { cartItems, categories, products, shoppingSessions, users, wishlistItems } from "../../db/schema.js";
import { HttpError } from "../../middleware/error-handler.js";
import { optionalNeonAuth, requireNeonAuth } from "../auth/neon-auth-middleware.js";

const COOKIE_NAME = "emmanex_shopping_session";
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";

function readCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
}

function writeSessionCookie(res: Response, token: string) {
  const attributes = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    isProduction ? "SameSite=None" : "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_LIFETIME_MS / 1000)}`,
  ];
  if (isProduction) attributes.push("Secure");
  res.append("Set-Cookie", attributes.join("; "));
}

async function getOrCreateGuestSession(req: Request, res: Response) {
  const existingToken = readCookie(req, COOKIE_NAME);
  if (existingToken && /^[a-f0-9]{64}$/.test(existingToken)) {
    const tokenHash = createHash("sha256").update(existingToken).digest("hex");
    const [session] = await db.select().from(shoppingSessions).where(
      and(eq(shoppingSessions.tokenHash, tokenHash), gt(shoppingSessions.expiresAt, new Date())),
    ).limit(1);
    if (session) return session;
  }

  await db.delete(shoppingSessions).where(lt(shoppingSessions.expiresAt, new Date()));
  const token = randomBytes(32).toString("hex");
  const [session] = await db.insert(shoppingSessions).values({
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
  }).returning();
  writeSessionCookie(res, token);
  return session;
}

async function getCustomerId(req: Request): Promise<string> {
  const neonUserId = req.neonAuthUser?.id;
  if (!neonUserId) throw new HttpError(401, "Authentication is required.");
  const [user] = await db.select({ id: users.id }).from(users)
    .where(eq(users.neonAuthUserId, neonUserId)).limit(1);
  if (!user) throw new HttpError(409, "Your customer profile is not ready. Please refresh and try again.");
  return user.id;
}

async function resolveCartOwner(req: Request, res: Response) {
  if (req.neonAuthUser) {
    const userId = await getCustomerId(req);
    const token = readCookie(req, COOKIE_NAME);
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const [session] = await db.select().from(shoppingSessions).where(eq(shoppingSessions.tokenHash, tokenHash)).limit(1);
      if (session) {
        const guestItems = await db.select().from(cartItems).where(eq(cartItems.sessionId, session.id));
        for (const item of guestItems) {
          const [product] = await db.select({ stock: products.stock }).from(products).where(eq(products.id, item.productId)).limit(1);
          if (!product || product.stock < 1) continue;
          const [existing] = await db.select().from(cartItems).where(and(eq(cartItems.userId, userId), eq(cartItems.productId, item.productId))).limit(1);
          const mergedQuantity = Math.min(product.stock, (existing?.quantity ?? 0) + item.quantity);
          if (existing) {
            await db.update(cartItems).set({ quantity: mergedQuantity, updatedAt: new Date() }).where(eq(cartItems.id, existing.id));
          } else {
            await db.insert(cartItems).values({ userId, productId: item.productId, quantity: mergedQuantity });
          }
        }
        await db.delete(cartItems).where(eq(cartItems.sessionId, session.id));
      }
    }
    return { userId, sessionId: null as string | null };
  }
  const session = await getOrCreateGuestSession(req, res);
  return { userId: null as string | null, sessionId: session.id };
}

async function getCartItems(owner: { userId: string | null; sessionId: string | null }) {
  const condition = owner.userId
    ? eq(cartItems.userId, owner.userId)
    : eq(cartItems.sessionId, owner.sessionId!);
  const rows = await db.select({
    id: products.id,
    name: products.name,
    slug: products.slug,
    description: products.description,
    price: products.price,
    imageUrl: products.imageUrl,
    stock: products.stock,
    categoryId: categories.id,
    categoryName: categories.name,
    categorySlug: categories.slug,
    quantity: cartItems.quantity,
  }).from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(condition);
  return rows.map((row) => ({
    product: {
      id: row.id, name: row.name, slug: row.slug, description: row.description,
      price: row.price, imageUrl: row.imageUrl,
      category: row.categoryId && row.categoryName && row.categorySlug
        ? { id: row.categoryId, name: row.categoryName, slug: row.categorySlug } : null,
      inStock: row.stock > 0,
    },
    quantity: row.quantity,
  }));
}

export function createShoppingRouter() {
  const router = Router();
  const authConfig = getAuthConfig();

  router.use("/cart", optionalNeonAuth(authConfig));
  router.get("/cart", async (req, res, next) => {
    try {
      const owner = await resolveCartOwner(req, res);
      res.json(successResponse("Shopping bag retrieved.", { items: await getCartItems(owner) }));
    } catch (error) { next(error); }
  });

  router.post("/cart/items", async (req, res, next) => {
    try {
      const productId = req.body?.productId;
      const quantity = req.body?.quantity ?? 1;
      if (typeof productId !== "string" || !/^[0-9a-f-]{36}$/i.test(productId)) throw new HttpError(400, "A valid productId is required.");
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw new HttpError(400, "Quantity must be between 1 and 99.");
      const [product] = await db.select({ id: products.id, stock: products.stock, isActive: products.isActive }).from(products).where(eq(products.id, productId)).limit(1);
      if (!product || !product.isActive) throw new HttpError(404, "Product not found.");
      if (product.stock < quantity) throw new HttpError(409, "There is not enough stock for this quantity.");
      const owner = await resolveCartOwner(req, res);
      const ownerValues = owner.userId
        ? { userId: owner.userId, productId, quantity }
        : { sessionId: owner.sessionId!, productId, quantity };
      const conflictTarget = owner.userId
        ? [cartItems.userId, cartItems.productId]
        : [cartItems.sessionId, cartItems.productId];
      const [savedItem] = await db.insert(cartItems).values(ownerValues)
        .onConflictDoUpdate({
          target: conflictTarget,
          set: {
            quantity: sql`${cartItems.quantity} + ${quantity}`,
            updatedAt: new Date(),
          },
          setWhere: sql`${cartItems.quantity} + ${quantity} <= ${product.stock}`,
        })
        .returning({ id: cartItems.id });
      if (!savedItem) throw new HttpError(409, "There is not enough stock for this quantity.");
      res.status(201).json(successResponse("Product added to your bag.", { items: await getCartItems(owner) }));
    } catch (error) { next(error); }
  });

  router.patch("/cart/items/:productId", async (req, res, next) => {
    try {
      const quantity = req.body?.quantity;
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw new HttpError(400, "Quantity must be between 1 and 99.");
      const owner = await resolveCartOwner(req, res);
      const condition = owner.userId
        ? and(eq(cartItems.userId, owner.userId), eq(cartItems.productId, req.params.productId))
        : and(eq(cartItems.sessionId, owner.sessionId!), eq(cartItems.productId, req.params.productId));
      const [item] = await db.select({ id: cartItems.id, stock: products.stock }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(condition).limit(1);
      if (!item) throw new HttpError(404, "Cart item not found.");
      if (quantity > item.stock) throw new HttpError(409, "There is not enough stock for this quantity.");
      await db.update(cartItems).set({ quantity, updatedAt: new Date() }).where(eq(cartItems.id, item.id));
      res.json(successResponse("Shopping bag updated.", { items: await getCartItems(owner) }));
    } catch (error) { next(error); }
  });

  router.delete("/cart/items/:productId", async (req, res, next) => {
    try {
      const owner = await resolveCartOwner(req, res);
      const condition = owner.userId
        ? and(eq(cartItems.userId, owner.userId), eq(cartItems.productId, req.params.productId))
        : and(eq(cartItems.sessionId, owner.sessionId!), eq(cartItems.productId, req.params.productId));
      await db.delete(cartItems).where(condition);
      res.json(successResponse("Product removed from your bag.", { items: await getCartItems(owner) }));
    } catch (error) { next(error); }
  });

  router.use("/wishlist", requireNeonAuth(authConfig));
  router.get("/wishlist", async (req, res, next) => {
    try {
      const userId = await getCustomerId(req);
      const rows = await db.select({
        id: products.id, name: products.name, slug: products.slug, description: products.description,
        price: products.price, imageUrl: products.imageUrl, stock: products.stock,
        categoryId: categories.id, categoryName: categories.name, categorySlug: categories.slug,
      }).from(wishlistItems).innerJoin(products, eq(wishlistItems.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id)).where(eq(wishlistItems.userId, userId));
      const items = rows.map((row) => ({
        id: row.id, name: row.name, slug: row.slug, description: row.description,
        price: row.price, imageUrl: row.imageUrl,
        category: row.categoryId && row.categoryName && row.categorySlug ? { id: row.categoryId, name: row.categoryName, slug: row.categorySlug } : null,
        inStock: row.stock > 0,
      }));
      res.json(successResponse("Wishlist retrieved.", { items }));
    } catch (error) { next(error); }
  });

  router.post("/wishlist/items", async (req, res, next) => {
    try {
      const userId = await getCustomerId(req);
      const productId = req.body?.productId;
      if (typeof productId !== "string" || !/^[0-9a-f-]{36}$/i.test(productId)) throw new HttpError(400, "A valid productId is required.");
      const [product] = await db.select({ id: products.id, isActive: products.isActive }).from(products).where(eq(products.id, productId)).limit(1);
      if (!product || !product.isActive) throw new HttpError(404, "Product not found.");
      await db.insert(wishlistItems).values({ userId, productId }).onConflictDoNothing();
      res.status(201).json(successResponse("Product saved to your wishlist.", {}));
    } catch (error) { next(error); }
  });

  router.delete("/wishlist/items/:productId", async (req, res, next) => {
    try {
      const userId = await getCustomerId(req);
      await db.delete(wishlistItems).where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, req.params.productId)));
      res.json(successResponse("Product removed from your wishlist.", {}));
    } catch (error) { next(error); }
  });

  return router;
}
