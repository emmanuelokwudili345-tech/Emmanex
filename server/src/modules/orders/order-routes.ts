import { and, asc, eq, gte, sql } from "drizzle-orm";
import { Router, type RequestHandler } from "express";
import { successResponse } from "../../api-response.js";
import { getAuthConfig } from "../../config/env.js";
import { db } from "../../db/index.js";
import { cartItems, orderItems, orders, products, users } from "../../db/schema.js";
import { HttpError } from "../../middleware/error-handler.js";
import { requireNeonAuth } from "../auth/neon-auth-middleware.js";
import { findShippingOption, shippingOptions } from "./shipping-options.js";

export type MockPaymentOutcome = "success" | "failure";

export interface DeliveryDetails {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
}

export interface OrderConfirmation {
  id: string;
  status: "confirmed";
  subtotal: string;
  shippingFee: string;
  total: string;
  items: Array<{
    productName: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
  }>;
}

export interface OrderDependencies {
  findCustomer(neonAuthUserId: string): Promise<{ id: string } | undefined>;
  createSuccessfulMockOrder(input: {
    userId: string;
    delivery: DeliveryDetails;
  }): Promise<OrderConfirmation>;
}

interface CheckoutRequest extends DeliveryDetails {
  mockPaymentOutcome: MockPaymentOutcome;
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} is required.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new HttpError(400, `${field} must be between 1 and ${maxLength} characters.`);
  }
  return normalized;
}

function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new HttpError(400, `${field} must be ${maxLength} characters or fewer.`);
  }
  return value.trim() || null;
}

function parseCheckoutRequest(value: unknown): CheckoutRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new HttpError(400, "Checkout details are invalid.");
  }
  const body = value as Record<string, unknown>;
  const state = requiredText(body.state, "State", 100);
  const shippingOption = findShippingOption(state);
  if (!shippingOption) throw new HttpError(400, "Choose a valid Nigerian state or territory.");

  if (body.mockPaymentOutcome !== "success" && body.mockPaymentOutcome !== "failure") {
    throw new HttpError(400, "Choose a mock payment outcome.");
  }

  const phone = requiredText(body.phone, "Phone number", 30);
  if (!/^[+\d][\d\s().-]{6,29}$/.test(phone)) {
    throw new HttpError(400, "Enter a valid phone number.");
  }

  return {
    recipientName: requiredText(body.recipientName, "Recipient name", 200),
    phone,
    addressLine1: requiredText(body.addressLine1, "Street address", 255),
    addressLine2: optionalText(body.addressLine2, "Address line 2", 255),
    city: requiredText(body.city, "City", 100),
    state: shippingOption.state,
    postalCode: optionalText(body.postalCode, "Postal code", 20),
    mockPaymentOutcome: body.mockPaymentOutcome,
  };
}

function toCents(amount: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) throw new HttpError(500, "A product price could not be processed.");
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
}

function fromCents(amount: bigint): string {
  return `${amount / 100n}.${(amount % 100n).toString().padStart(2, "0")}`;
}

function createProductionDependencies(): OrderDependencies {
  return {
    async findCustomer(neonAuthUserId) {
      const [customer] = await db.select({ id: users.id, isActive: users.isActive })
        .from(users)
        .where(eq(users.neonAuthUserId, neonAuthUserId))
        .limit(1);
      if (customer && !customer.isActive) throw new HttpError(403, "This account is inactive.");
      return customer ? { id: customer.id } : undefined;
    },

    async createSuccessfulMockOrder({ userId, delivery }) {
      const shipping = findShippingOption(delivery.state);
      if (!shipping) throw new HttpError(400, "Choose a valid Nigerian state or territory.");
      const shippingCents = toCents(shipping.shippingFee);

      return db.transaction(async (tx) => {
        const cart = await tx.select({
          productId: products.id,
          productName: products.name,
          unitPrice: products.price,
          stock: products.stock,
          isActive: products.isActive,
          quantity: cartItems.quantity,
        })
          .from(cartItems)
          .innerJoin(products, eq(cartItems.productId, products.id))
          .where(eq(cartItems.userId, userId))
          .orderBy(asc(products.id))
          .for("update");

        if (cart.length === 0) throw new HttpError(409, "Your shopping bag is empty.");

        for (const item of cart) {
          if (!item.isActive) throw new HttpError(409, `${item.productName} is no longer available.`);
          if (item.stock < item.quantity) {
            throw new HttpError(409, `There is not enough stock for ${item.productName}.`);
          }
        }

        const itemSnapshots = cart.map((item) => {
          const unitCents = toCents(item.unitPrice);
          return {
            productId: item.productId,
            productName: item.productName,
            unitPrice: fromCents(unitCents),
            quantity: item.quantity,
            lineTotal: fromCents(unitCents * BigInt(item.quantity)),
            lineCents: unitCents * BigInt(item.quantity),
          };
        });
        const subtotalCents = itemSnapshots.reduce((total, item) => total + item.lineCents, 0n);
        const subtotal = fromCents(subtotalCents);
        const shippingFee = fromCents(shippingCents);
        const total = fromCents(subtotalCents + shippingCents);

        const [order] = await tx.insert(orders).values({
          userId,
          status: "confirmed",
          subtotal,
          shippingFee,
          total,
          recipientName: delivery.recipientName,
          phone: delivery.phone,
          addressLine1: delivery.addressLine1,
          addressLine2: delivery.addressLine2,
          city: delivery.city,
          state: delivery.state,
          postalCode: delivery.postalCode,
          country: "Nigeria",
        }).returning({ id: orders.id });

        for (const item of itemSnapshots) {
          const [updatedProduct] = await tx.update(products)
            .set({ stock: sql`${products.stock} - ${item.quantity}`, updatedAt: new Date() })
            .where(and(
              eq(products.id, item.productId),
              eq(products.isActive, true),
              gte(products.stock, item.quantity),
            ))
            .returning({ id: products.id });
          if (!updatedProduct) {
            throw new HttpError(409, `There is not enough stock for ${item.productName}.`);
          }
        }

        await tx.insert(orderItems).values(itemSnapshots.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })));
        await tx.delete(cartItems).where(eq(cartItems.userId, userId));

        return {
          id: order.id,
          status: "confirmed",
          subtotal,
          shippingFee,
          total,
          items: itemSnapshots.map(({ productName, unitPrice, quantity, lineTotal }) => ({
            productName,
            unitPrice,
            quantity,
            lineTotal,
          })),
        };
      });
    },
  };
}

export function createOrderRouter(
  dependencies: OrderDependencies = createProductionDependencies(),
  authenticate: RequestHandler = requireNeonAuth(getAuthConfig()),
  mockPaymentsEnabled = process.env.NODE_ENV !== "production",
) {
  const router = Router();

  router.get("/shipping/options", authenticate, (_req, res) => {
    res.json(successResponse("Shipping options retrieved.", { options: shippingOptions }));
  });

  router.post("/orders", authenticate, async (req, res, next) => {
    try {
      if (!mockPaymentsEnabled) {
        throw new HttpError(503, "Checkout is unavailable until a payment provider is configured.");
      }

      const checkout = parseCheckoutRequest(req.body);
      if (checkout.mockPaymentOutcome === "failure") {
        throw new HttpError(402, "The payment simulation failed. Your bag and inventory were not changed.");
      }

      const neonAuthUserId = req.neonAuthUser?.id;
      if (!neonAuthUserId) throw new HttpError(401, "Authentication is required.");
      const customer = await dependencies.findCustomer(neonAuthUserId);
      if (!customer) throw new HttpError(409, "Your customer profile is not ready. Please refresh and try again.");

      const order = await dependencies.createSuccessfulMockOrder({
        userId: customer.id,
        delivery: {
          recipientName: checkout.recipientName,
          phone: checkout.phone,
          addressLine1: checkout.addressLine1,
          addressLine2: checkout.addressLine2,
          city: checkout.city,
          state: checkout.state,
          postalCode: checkout.postalCode,
        },
      });

      res.status(201).json(successResponse("Mock payment succeeded and your order was placed.", { order }));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
