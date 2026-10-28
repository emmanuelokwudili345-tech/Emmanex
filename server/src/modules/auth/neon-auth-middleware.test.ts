import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";
import type { NextFunction, RequestHandler } from "express";
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import type { AuthConfig } from "../../config/env.js";
import { HttpError } from "../../middleware/error-handler.js";
import { requireNeonAuth } from "./neon-auth-middleware.js";

let server: Server;
let baseUrl: string;
let privateKey: CryptoKey;
let publicJwk: Record<string, unknown>;

before(async () => {
  const keys = await generateKeyPair("EdDSA");
  privateKey = keys.privateKey as CryptoKey;

  const jwk = await exportJWK(keys.publicKey);
  publicJwk = {
    ...jwk,
    kid: "emmanex-test-key",
    alg: "EdDSA",
    use: "sig",
  };

  server = createServer((req, res) => {
    if (req.url === "/.well-known/jwks.json") {
      res.writeHead(200, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify({ keys: [publicJwk] }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Could not determine the test server address."));
        return;
      }

      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

function createConfig(configured = true): AuthConfig {
  return {
    corsOrigins: [],
    ...(configured
      ? {
          neonAuthBaseUrl: baseUrl,
          neonAuthJwksUrl: `${baseUrl}/.well-known/jwks.json`,
        }
      : {}),
  };
}

async function createToken(
  options: {
    issuer?: string;
    subject?: string;
    expired?: boolean;
  } = {},
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  let token = new SignJWT({ email: "customer@example.test" })
    .setProtectedHeader({
      alg: "EdDSA",
      kid: "emmanex-test-key",
    })
    .setIssuer(options.issuer ?? baseUrl)
    .setIssuedAt(now)
    .setExpirationTime(options.expired ? now - 60 : now + 300);

  if (options.subject !== undefined) {
    token = token.setSubject(options.subject);
  } else {
    token = token.setSubject("test-user-id");
  }

  return token.sign(privateKey);
}

async function invokeMiddleware(
  middleware: RequestHandler,
  authorization?: string,
) {
  let nextCalled = false;
  let nextError: unknown;

  const req = {
    get(name: string) {
      if (name.toLowerCase() === "authorization") {
        return authorization;
      }

      return undefined;
    },
  } as Parameters<RequestHandler>[0];

  const res = {} as Parameters<RequestHandler>[1];

  const next: NextFunction = (error?: unknown) => {
    nextCalled = true;
    nextError = error;
  };

  await middleware(req, res, next);

  return {
    req,
    nextCalled,
    nextError,
  };
}

test("rejects requests without a bearer token", async () => {
  const result = await invokeMiddleware(
    requireNeonAuth(createConfig()),
  );

  assert.equal(result.nextCalled, true);
  assert.ok(result.nextError instanceof HttpError);
  assert.equal((result.nextError as HttpError).statusCode, 401);
});

test("returns 503 when Neon Auth is not configured", async () => {
  const result = await invokeMiddleware(
    requireNeonAuth(createConfig(false)),
  );

  assert.equal(result.nextCalled, true);
  assert.ok(result.nextError instanceof HttpError);
  assert.equal((result.nextError as HttpError).statusCode, 503);
});

test("rejects an invalid token", async () => {
  const result = await invokeMiddleware(
    requireNeonAuth(createConfig()),
    "Bearer not-a-valid-token",
  );

  assert.equal(result.nextCalled, true);
  assert.ok(result.nextError instanceof HttpError);
  assert.equal((result.nextError as HttpError).statusCode, 401);
});

test("rejects a token with the wrong issuer", async () => {
  const token = await createToken({
    issuer: "http://wrong-issuer.example.test",
  });

  const result = await invokeMiddleware(
    requireNeonAuth(createConfig()),
    `Bearer ${token}`,
  );

  assert.equal(result.nextCalled, true);
  assert.ok(result.nextError instanceof HttpError);
  assert.equal((result.nextError as HttpError).statusCode, 401);
});

test("rejects an expired token", async () => {
  const token = await createToken({ expired: true });

  const result = await invokeMiddleware(
    requireNeonAuth(createConfig()),
    `Bearer ${token}`,
  );

  assert.equal(result.nextCalled, true);
  assert.ok(result.nextError instanceof HttpError);
  assert.equal((result.nextError as HttpError).statusCode, 401);
});

test("rejects a token without a subject", async () => {
  const token = await createToken({ subject: "" });

  const result = await invokeMiddleware(
    requireNeonAuth(createConfig()),
    `Bearer ${token}`,
  );

  assert.equal(result.nextCalled, true);
  assert.ok(result.nextError instanceof HttpError);
  assert.equal((result.nextError as HttpError).statusCode, 401);
});

test("accepts a valid token and attaches the authenticated user", async () => {
  const token = await createToken();

  const result = await invokeMiddleware(
    requireNeonAuth(createConfig()),
    `Bearer ${token}`,
  );

  assert.equal(result.nextCalled, true);
  assert.equal(result.nextError, undefined);
  assert.deepEqual(result.req.neonAuthUser, {
    id: "test-user-id",
    email: "customer@example.test",
  });
});
