import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { cartItems, orderItems, orders, products, users } from "../../db/schema.js";
import { HttpError } from "../../middleware/error-handler.js";
import { findShippingOption } from "./shipping-options.js";
import type {
  CustomerOrder,
  DeliveryDetails,
  OrderConfirmation,
  OrderDependencies,
  OrderItemSummary,
} from "./order-types.js";

function toCents(amount: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) {
    throw new HttpError(500, "A product price could not be processed.");
  }

  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
}

function fromCents(amount: bigint): string {
  return `${amount / 100n}.${(amount % 100n).toString().padStart(2, "0")}`;
}

function mapOrderItem(row: {
  productName: string | null;
  unitPrice: string | null;
  quantity: number | null;
  lineTotal: string | null;
}): OrderItemSummary | undefined {
  if (
    row.productName === null ||
    row.unitPrice === null ||
    row.quantity === null ||
    row.lineTotal === null
  ) {
    return undefined;
  }

  return {
    productName: row.productName,
    unitPrice: row.unitPrice,
    quantity: row.quantity,
    lineTotal: row.lineTotal,
  };
}

async function loadCustomerOrders(userId: string, orderId?: string): Promise<CustomerOrder[]> {
  const rows = await db.select({
    id: orders.id,
    status: orders.status,
    isDemo: orders.isDemo,
    subtotal: orders.subtotal,
    shippingFee: orders.shippingFee,
    total: orders.total,
    createdAt: orders.createdAt,
    recipientName: orders.recipientName,
    recipientEmail: orders.recipientEmail,
    phone: orders.phone,
    addressLine1: orders.addressLine1,
    addressLine2: orders.addressLine2,
    city: orders.city,
    state: orders.state,
    postalCode: orders.postalCode,
    country: orders.country,
    deliveryMethod: orders.deliveryMethod,
    paymentMethod: orders.paymentMethod,
    paymentStatus: orders.paymentStatus,
    productName: orderItems.productName,
    unitPrice: orderItems.unitPrice,
    quantity: orderItems.quantity,
    lineTotal: orderItems.lineTotal,
  })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(orderId
      ? and(eq(orders.userId, userId), eq(orders.id, orderId))
      : eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt), asc(orderItems.id));

  const groupedOrders = new Map<string, CustomerOrder>();

  for (const row of rows) {
    let order = groupedOrders.get(row.id);

    if (!order) {
      order = {
        id: row.id,
        status: row.status,
        isDemo: row.isDemo,
        subtotal: row.subtotal,
        shippingFee: row.shippingFee,
        total: row.total,
        createdAt: row.createdAt.toISOString(),
        recipientName: row.recipientName,
        recipientEmail: row.recipientEmail,
        phone: row.phone,
        addressLine1: row.addressLine1,
        addressLine2: row.addressLine2,
        city: row.city,
        state: row.state,
        postalCode: row.postalCode,
        country: row.country,
        deliveryMethod: row.deliveryMethod,
        paymentMethod: row.paymentMethod,
        paymentStatus: row.paymentStatus,
        items: [],
      };
      groupedOrders.set(row.id, order);
    }

    const item = mapOrderItem(row);
    if (item) {
      order.items.push(item);
    }
  }

  return [...groupedOrders.values()];
}

async function createDemoOrder(
  userId: string,
  delivery: DeliveryDetails,
): Promise<OrderConfirmation> {
  const shipping = findShippingOption(delivery.state);
  if (!shipping) {
    throw new HttpError(400, "Choose a valid Nigerian state or territory.");
  }

  const shippingFeeCents = toCents(shipping.shippingFee);

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

    if (cart.length === 0) {
      throw new HttpError(409, "Your shopping bag is empty.");
    }
    for (const item of cart) {
      if (!item.isActive) {
        throw new HttpError(409, `${item.productName} is no longer available.`);
      }
      if (item.stock < item.quantity) {
        throw new HttpError(409, `There is not enough stock for ${item.productName}.`);
      }
    }

    const itemSnapshots = cart.map((item) => {
      const unitPriceCents = toCents(item.unitPrice);
      const lineTotalCents = unitPriceCents * BigInt(item.quantity);

      return {
        productId: item.productId,
        productName: item.productName,
        unitPrice: fromCents(unitPriceCents),
        quantity: item.quantity,
        lineTotal: fromCents(lineTotalCents),
        lineTotalCents,
      };
    });

    const subtotalCents = itemSnapshots.reduce(
      (total, item) => total + item.lineTotalCents,
      0n,
    );
    const subtotal = fromCents(subtotalCents);
    const shippingFee = fromCents(shippingFeeCents);
    const total = fromCents(subtotalCents + shippingFeeCents);

    const [savedOrder] = await tx.insert(orders).values({
      userId,
      status: "pending",
      isDemo: true,
      subtotal,
      shippingFee,
      total,
      recipientName: delivery.recipientName,
      recipientEmail: delivery.recipientEmail,
      phone: delivery.phone,
      addressLine1: delivery.addressLine1,
      addressLine2: delivery.addressLine2,
      city: delivery.city,
      state: delivery.state,
      postalCode: delivery.postalCode,
      country: "Nigeria",
      deliveryMethod: delivery.deliveryMethod,
      paymentMethod: delivery.paymentMethod,
      paymentStatus: "simulated",
    }).returning({
      id: orders.id,
      createdAt: orders.createdAt,
    });

    await tx.insert(orderItems).values(itemSnapshots.map((item) => ({
      orderId: savedOrder.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })));
    await tx.delete(cartItems).where(eq(cartItems.userId, userId));

    return {
      id: savedOrder.id,
      status: "pending",
      isDemo: true,
      subtotal,
      shippingFee,
      total,
      createdAt: savedOrder.createdAt.toISOString(),
      recipientName: delivery.recipientName,
      recipientEmail: delivery.recipientEmail,
      phone: delivery.phone,
      addressLine1: delivery.addressLine1,
      addressLine2: delivery.addressLine2,
      city: delivery.city,
      state: delivery.state,
      postalCode: delivery.postalCode,
      country: "Nigeria",
      deliveryMethod: delivery.deliveryMethod,
      paymentMethod: delivery.paymentMethod,
      paymentStatus: "simulated",
      items: itemSnapshots.map(({ productName, unitPrice, quantity, lineTotal }) => ({
        productName,
        unitPrice,
        quantity,
        lineTotal,
      })),
    };
  });
}

export const orderService: OrderDependencies = {
  async findCustomer(neonAuthUserId) {
    const [customer] = await db.select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.neonAuthUserId, neonAuthUserId))
      .limit(1);

    if (customer && !customer.isActive) {
      throw new HttpError(403, "This account is inactive.");
    }

    return customer ? { id: customer.id } : undefined;
  },

  listCustomerOrders(userId) {
    return loadCustomerOrders(userId);
  },

  async findCustomerOrder(userId, orderId) {
    const [order] = await loadCustomerOrders(userId, orderId);
    return order;
  },

  createDemoOrder({ userId, delivery }) {
    return createDemoOrder(userId, delivery);
  },
};
