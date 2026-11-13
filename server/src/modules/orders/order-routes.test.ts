import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { RequestHandler } from "express";
import express from "express";
import { afterEach, test } from "node:test";
import { errorHandler } from "../../middleware/error-handler.js";
import { createOrderRouter } from "./order-routes.js";
import type { OrderConfirmation, OrderDependencies } from "./order-types.js";

const mockOrder: OrderConfirmation = {
  id: "2f85ddc6-5518-4daf-9e7b-3012d493b9f4",
  status: "pending",
  isDemo: true,
  subtotal: "10000.00",
  shippingFee: "2500.00",
  total: "12500.00",
  createdAt: "2026-11-11T00:00:00.000Z",
  recipientName: "Test Customer",
  recipientEmail: "customer@example.test",
  phone: "+234 800 000 0000",
  addressLine1: "1 Example Street",
  addressLine2: null,
  city: "Ikeja",
  state: "Lagos",
  postalCode: "100001",
  country: "Nigeria",
  deliveryMethod: "standard",
  paymentMethod: "demo",
  paymentStatus: "simulated",
  items: [{ productName: "Test product", unitPrice: "10000.00", quantity: 1, lineTotal: "10000.00" }],
};

const checkoutBody = {
  recipientName: "Test Customer",
  recipientEmail: "customer@example.test",
  phone: "+234 800 000 0000",
  addressLine1: "1 Example Street",
  addressLine2: "",
  city: "Ikeja",
  state: "Lagos",
  postalCode: "100001",
  deliveryMethod: "standard",
  paymentMethod: "demo",
};

const authenticate: RequestHandler = (req, _res, next) => {
  req.neonAuthUser = { id: "neon-user-123", email: "customer@example.test" };
  next();
};

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

async function startOrderServer(
  dependencies: OrderDependencies,
) {
  const app = express();
  app.use(express.json());
  app.use("/api", createOrderRouter(dependencies, authenticate));
  app.use(errorHandler);
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

function createDependencies(overrides: Partial<OrderDependencies> = {}) {
  return {
    findCustomer: async () => ({ id: "customer-123" }),
    listCustomerOrders: async () => [],
    findCustomerOrder: async () => mockOrder,
    createDemoOrder: async () => mockOrder,
    ...overrides,
  } satisfies OrderDependencies;
}

test("shipping options return the starter zone fees", async () => {
  const baseUrl = await startOrderServer(createDependencies());
  const response = await fetch(`${baseUrl}/api/shipping/options`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.options.find((option: { state: string }) => option.state === "Lagos").shippingFee, "2500.00");
  assert.equal(body.data.options.find((option: { state: string }) => option.state === "Oyo").shippingFee, "4000.00");
  assert.equal(body.data.options.find((option: { state: string }) => option.state === "Federal Capital Territory").shippingFee, "6500.00");
});

test("checkout validates delivery and passes details to the order service", async () => {
  let receivedInput: Parameters<OrderDependencies["createDemoOrder"]>[0] | undefined;
  const dependencies = createDependencies({
    createDemoOrder: async (input) => {
      receivedInput = input;
      return mockOrder;
    },
  });
  const baseUrl = await startOrderServer(dependencies);
  const response = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(checkoutBody),
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.message, "Order placed. Demo payment was simulated; no payment was collected.");
  assert.equal(body.data.order.total, "12500.00");
  assert.equal(body.data.order.status, "pending");
  assert.equal(body.data.order.isDemo, true);
  assert.equal(body.data.order.paymentStatus, "simulated");
  assert.equal(body.data.order.recipientEmail, "customer@example.test");
  assert.equal(receivedInput?.userId, "customer-123");
  assert.equal(receivedInput?.delivery.state, "Lagos");
  assert.equal(receivedInput?.delivery.deliveryMethod, "standard");
  assert.equal(receivedInput?.delivery.paymentMethod, "demo");
});

test("checkout rejects invalid email and unsupported payment methods", async () => {
  let createOrderCalled = false;
  const dependencies = createDependencies({
    createDemoOrder: async () => {
      createOrderCalled = true;
      return mockOrder;
    },
  });
  const baseUrl = await startOrderServer(dependencies);
  const invalidEmail = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...checkoutBody, recipientEmail: "not-an-email" }),
  });
  const invalidPaymentMethod = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...checkoutBody, paymentMethod: "card" }),
  });

  assert.equal(invalidEmail.status, 400);
  assert.equal(invalidPaymentMethod.status, 400);
  assert.equal(createOrderCalled, false);
});

test("checkout rejects unknown delivery states", async () => {
  const baseUrl = await startOrderServer(createDependencies());
  const response = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...checkoutBody, state: "Atlantis" }),
  });

  assert.equal(response.status, 400);
});

test("order history is scoped to the signed-in customer", async () => {
  let requestedCustomerId: string | undefined;
  const dependencies = createDependencies({
    listCustomerOrders: async (userId) => {
      requestedCustomerId = userId;
      return [mockOrder];
    },
  });
  const baseUrl = await startOrderServer(dependencies);
  const response = await fetch(`${baseUrl}/api/orders`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(requestedCustomerId, "customer-123");
  assert.deepEqual(body.data.orders, [mockOrder]);
});

test("order confirmation is returned only through the signed-in customer scope", async () => {
  let requestedCustomerId: string | undefined;
  let requestedOrderId: string | undefined;
  const dependencies = createDependencies({
    findCustomerOrder: async (userId, orderId) => {
      requestedCustomerId = userId;
      requestedOrderId = orderId;
      return mockOrder;
    },
  });
  const baseUrl = await startOrderServer(dependencies);
  const response = await fetch(`${baseUrl}/api/orders/${mockOrder.id}`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(requestedCustomerId, "customer-123");
  assert.equal(requestedOrderId, mockOrder.id);
  assert.deepEqual(body.data.order, mockOrder);
});

test("order confirmation rejects malformed and unknown order references", async () => {
  const dependencies = createDependencies({
    findCustomerOrder: async () => undefined,
  });
  const baseUrl = await startOrderServer(dependencies);
  const invalidReference = await fetch(`${baseUrl}/api/orders/not-a-uuid`);
  const unknownOrder = await fetch(`${baseUrl}/api/orders/2f85ddc6-5518-4daf-9e7b-3012d493b9f4`);

  assert.equal(invalidReference.status, 400);
  assert.equal(unknownOrder.status, 404);
});
