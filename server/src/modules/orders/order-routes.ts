import { and, asc, desc, eq } from "drizzle-orm";
import { Router, type RequestHandler } from "express";
import { successResponse } from "../../api-response.js";
import { getAuthConfig } from "../../config/env.js";
import { db } from "../../db/index.js";
import { cartItems, orderItems, orders, products, users } from "../../db/schema.js";
import { HttpError } from "../../middleware/error-handler.js";
import { requireNeonAuth } from "../auth/neon-auth-middleware.js";
import { findShippingOption, shippingOptions } from "./shipping-options.js";

export type DemoCheckoutOutcome = "success" | "failure";

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
  status: CustomerOrderStatus;
  isDemo: boolean;
  subtotal: string;
  shippingFee: string;
  total: string;
  createdAt: string;
  items: Array<{
    productName: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
  }>;
}

export type CustomerOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type CustomerOrder = OrderConfirmation

export interface OrderDependencies {
  findCustomer(neonAuthUserId: string): Promise<{ id: string } | undefined>;
  listCustomerOrders(userId: string): Promise<CustomerOrder[]>;
  createDemoOrder(input: {
    userId: string;
    delivery: DeliveryDetails;
  }): Promise<OrderConfirmation>;
}

interface CheckoutRequest extends DeliveryDetails {
  demoOutcome: DemoCheckoutOutcome;
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

  if (body.demoOutcome !== "success" && body.demoOutcome !== "failure") {
    throw new HttpError(400, "Choose a demo checkout outcome.");
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
    demoOutcome: body.demoOutcome,
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

    async listCustomerOrders(userId) {
      const rows = await db.select({
        id: orders.id,
        status: orders.status,
        isDemo: orders.isDemo,
        subtotal: orders.subtotal,
        shippingFee: orders.shippingFee,
        total: orders.total,
        createdAt: orders.createdAt,
        productName: orderItems.productName,
        unitPrice: orderItems.unitPrice,
        quantity: orderItems.quantity,
        lineTotal: orderItems.lineTotal,
      })
        .from(orders)
        .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt), asc(orderItems.id));

      const customerOrders = new Map<string, CustomerOrder>();

      for (const row of rows) {
        let order = customerOrders.get(row.id);

        if (!order) {
          order = {
            id: row.id,
            status: row.status,
            isDemo: row.isDemo,
            subtotal: row.subtotal,
            shippingFee: row.shippingFee,
            total: row.total,
            createdAt: row.createdAt.toISOString(),
            items: [],
          };
          customerOrders.set(row.id, order);
        }

        if (
          row.productName !== null &&
          row.unitPrice !== null &&
          row.quantity !== null &&
          row.lineTotal !== null
        ) {
          order.items.push({
            productName: row.productName,
            unitPrice: row.unitPrice,
            quantity: row.quantity,
            lineTotal: row.lineTotal,
          });
        }
      }

      return [...customerOrders.values()];
    },

    async createDemoOrder({ userId, delivery }) {
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
          status: "pending",
          isDemo: true,
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
        }).returning({
          id: orders.id,
          createdAt: orders.createdAt,
        });

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
          status: "pending",
          isDemo: true,
          subtotal,
          shippingFee,
          total,
          createdAt: order.createdAt.toISOString(),
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
  demoCheckoutEnabled = process.env.DEMO_CHECKOUT_ENABLED === "true",
) {
  const router = Router();

  router.get("/shipping/options", authenticate, (_req, res) => {
    res.json(successResponse("Shipping options retrieved.", { options: shippingOptions }));
  });

  router.get("/orders", authenticate, async (req, res, next) => {
    try {
      const neonAuthUserId = req.neonAuthUser?.id;
      if (!neonAuthUserId) throw new HttpError(401, "Authentication is required.");
      const customer = await dependencies.findCustomer(neonAuthUserId);
      if (!customer) throw new HttpError(409, "Your customer profile is not ready. Please refresh and try again.");
      const orders = await dependencies.listCustomerOrders(customer.id);
      res.json(successResponse("Order history retrieved.", { orders }));
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders", authenticate, async (req, res, next) => {
    try {
      if (!demoCheckoutEnabled) {
        throw new HttpError(503, "Demo checkout is disabled.");
      }

      const checkout = parseCheckoutRequest(req.body);
      if (checkout.demoOutcome === "failure") {
        throw new HttpError(402, "The demo checkout failed. No order was saved and inventory was not changed.");
      }

      const neonAuthUserId = req.neonAuthUser?.id;
      if (!neonAuthUserId) throw new HttpError(401, "Authentication is required.");
      const customer = await dependencies.findCustomer(neonAuthUserId);
      if (!customer) throw new HttpError(409, "Your customer profile is not ready. Please refresh and try again.");

      const order = await dependencies.createDemoOrder({
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

      res.status(201).json(successResponse("Demo order saved. No payment was collected.", { order }));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
