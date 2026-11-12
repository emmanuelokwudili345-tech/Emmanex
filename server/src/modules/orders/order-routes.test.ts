import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { RequestHandler } from "express";
import express from "express";
import { afterEach, test } from "node:test";
import { errorHandler } from "../../middleware/error-handler.js";
import {
  createOrderRouter,
  type OrderConfirmation,
  type OrderDependencies,
} from "./order-routes.js";

const mockOrder: OrderConfirmation = {
  id: "order-123",
  status: "pending",
  isDemo: true,
  subtotal: "10000.00",
  shippingFee: "2500.00",
  total: "12500.00",
  createdAt: "2026-11-11T00:00:00.000Z",
  items: [{ productName: "Test product", unitPrice: "10000.00", quantity: 1, lineTotal: "10000.00" }],
};

const checkoutBody = {
  recipientName: "Test Customer",
  phone: "+234 800 000 0000",
  addressLine1: "1 Example Street",
  addressLine2: "",
  city: "Ikeja",
  state: "Lagos",
  postalCode: "100001",
  demoOutcome: "success",
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
  demoCheckoutEnabled = true,
) {
  const app = express();
  app.use(express.json());
  app.use("/api", createOrderRouter(dependencies, authenticate, demoCheckoutEnabled));
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

test("successful demo checkout saves an unpaid demo order and returns server totals", async () => {
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
  assert.equal(body.message, "Demo order saved. No payment was collected.");
  assert.equal(body.data.order.total, "12500.00");
  assert.equal(body.data.order.status, "pending");
  assert.equal(body.data.order.isDemo, true);
  assert.equal(receivedInput?.userId, "customer-123");
  assert.equal(receivedInput?.delivery.state, "Lagos");
});

test("failed demo checkout leaves order creation untouched", async () => {
  let createOrderCalled = false;
  const dependencies = createDependencies({
    createDemoOrder: async () => {
      createOrderCalled = true;
      return mockOrder;
    },
  });
  const baseUrl = await startOrderServer(dependencies);
  const response = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...checkoutBody, demoOutcome: "failure" }),
  });
  const body = await response.json();

  assert.equal(response.status, 402);
  assert.match(body.message, /No order was saved and inventory was not changed/);
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

test("demo checkout is disabled when the server does not allow it", async () => {
  let createOrderCalled = false;
  const dependencies = createDependencies({
    createDemoOrder: async () => {
      createOrderCalled = true;
      return mockOrder;
    },
  });
  const baseUrl = await startOrderServer(dependencies, false);
  const response = await fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(checkoutBody),
  });

  assert.equal(response.status, 503);
  assert.equal(createOrderCalled, false);
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
