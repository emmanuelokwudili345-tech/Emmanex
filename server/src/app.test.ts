import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import express from "express";
import { after, before, test } from "node:test";
import app, { createApp } from "./app.js";
import { getDatabaseUrl, getPort } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { validateBody } from "./middleware/validate-body.js";

const server = createServer(app);
let baseUrl: string;

async function startServer(application: express.Express) {
  const testServer: Server = createServer(application);
  await new Promise<void>((resolve) => {
    testServer.listen(0, "127.0.0.1", resolve);
  });

  const address = testServer.address();
  assert.ok(address && typeof address !== "string");

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        testServer.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}

before(async () => {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

test("health endpoint returns the standard success response", async () => {
  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "success",
    message: "Emmanex API is running",
    data: { status: "ok" },
  });
});

test("readiness endpoint succeeds when the database check succeeds", async () => {
  const testServer = await startServer(createApp(async () => {}));

  try {
    const response = await fetch(`${testServer.baseUrl}/api/health/ready`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "success",
      message: "Emmanex API is ready",
      data: { status: "ok" },
    });
  } finally {
    await testServer.close();
  }
});

test("readiness endpoint hides database error details", async () => {
  const testServer = await startServer(
    createApp(async () => {
      throw new Error("database connection details");
    }),
  );

  try {
    const response = await fetch(`${testServer.baseUrl}/api/health/ready`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      status: "error",
      message: "Database unavailable.",
    });
  } finally {
    await testServer.close();
  }
});

test("unknown routes use the standard not-found response", async () => {
  const response = await fetch(`${baseUrl}/api/missing`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    status: "error",
    message: "Route not found.",
  });
});

test("malformed JSON uses a client error response", async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    status: "error",
    message: "Request body contains invalid JSON.",
  });
});

test("request body validation rejects invalid bodies", async () => {
  const validationApp = express();
  validationApp.use(express.json());
  validationApp.post(
    "/api/validation-test",
    validateBody(
      (body): body is { name: string } =>
        typeof body === "object" &&
        body !== null &&
        "name" in body &&
        typeof body.name === "string",
    ),
    (_req, res) => res.json({ status: "success" }),
  );
  validationApp.use(errorHandler);
  const testServer = await startServer(validationApp);

  try {
    const response = await fetch(`${testServer.baseUrl}/api/validation-test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: 42 }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      status: "error",
      message: "Request body is invalid.",
    });
  } finally {
    await testServer.close();
  }
});

test("PORT defaults to 5000 and validates configured values", () => {
  assert.equal(getPort(undefined), 5000);
  assert.equal(getPort("3000"), 3000);
  assert.throws(() => getPort("0"), /PORT must be an integer/);
  assert.throws(() => getPort("invalid"), /PORT must be an integer/);
});

test("DATABASE_URL is required and returned trimmed", () => {
  assert.equal(
    getDatabaseUrl(" postgresql://database.example/db "),
    "postgresql://database.example/db",
  );
  assert.throws(() => getDatabaseUrl(""), /DATABASE_URL is required/);
  assert.throws(() => getDatabaseUrl("  "), /DATABASE_URL is required/);
});
