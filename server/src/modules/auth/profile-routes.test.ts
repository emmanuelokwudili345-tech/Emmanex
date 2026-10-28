import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import express, { type RequestHandler } from "express";
import { afterEach, test } from "node:test";
import { errorHandler } from "../../middleware/error-handler.js";
import { createProfileRouter } from "./profile-routes.js";

const neonUserId = "neon-user-123";

interface FakeAuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  isActivelyBanned: boolean;
}

interface FakeProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  neonAuthUserId: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function makeProfile(
  overrides: Partial<FakeProfile> = {},
): FakeProfile {
  return {
    id: "profile-123",
    firstName: "Test",
    lastName: "Customer",
    email: "test@example.com",
    neonAuthUserId: neonUserId,
    role: "customer",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makeAuthUser(
  overrides: Partial<FakeAuthUser> = {},
): FakeAuthUser {
  return {
    id: neonUserId,
    email: "test@example.com",
    name: "Test Customer",
    emailVerified: true,
    isActivelyBanned: false,
    ...overrides,
  };
}

function createTestApp(options: {
  authUser?: FakeAuthUser | null;
  linkedProfile?: FakeProfile;
  emailProfile?: FakeProfile;
} = {}) {
  let authUser = options.authUser ?? makeAuthUser();
  let linkedProfile = options.linkedProfile;
  let emailProfile = options.emailProfile;
  let createdProfile: FakeProfile | undefined;
  let createCount = 0;

  const dependencies = {
    async getAuthUser(id: string) {
      return id === authUser?.id ? authUser : null;
    },

    async findByNeonId(id: string) {
      if (linkedProfile?.neonAuthUserId === id) {
        return linkedProfile;
      }

      if (createdProfile?.neonAuthUserId === id) {
        return createdProfile;
      }

      return undefined;
    },

    async findByEmail(email: string) {
      if (emailProfile?.email === email) {
        return emailProfile;
      }

      if (linkedProfile?.email === email) {
        return linkedProfile;
      }

      if (createdProfile?.email === email) {
        return createdProfile;
      }

      return undefined;
    },

    async findEmailOwner(email: string, excludedUserId: string) {
      return Boolean(
        emailProfile &&
        emailProfile.email === email &&
        emailProfile.id !== excludedUserId,
      );
    },

    async updateEmail(userId: string, email: string) {
      if (linkedProfile?.id === userId) {
        linkedProfile = {
          ...linkedProfile,
          email,
          updatedAt: new Date(),
        };

        return linkedProfile;
      }

      return undefined;
    },

    async createCustomer(input: {
      firstName: string;
      lastName: string;
      email: string;
      neonAuthUserId: string;
    }) {
      createCount += 1;

      if (linkedProfile || createdProfile || emailProfile) {
        return undefined;
      }

      // Mirror the production database adapter: the route cannot
      // supply a role, so new profiles are always customers.
      createdProfile = makeProfile({
        ...input,
        role: "customer",
      });

      return createdProfile;
    },
  };

  const authenticate: RequestHandler = (req, _res, next) => {
    req.neonAuthUser = { id: neonUserId, email: "ignored@example.com" };
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/auth",
    createProfileRouter(dependencies, authenticate),
  );
  app.use(errorHandler);

  return {
    app,
    getCreatedProfile: () => createdProfile,
    getCreateCount: () => createCount,
  };
}

async function startTestServer(application: express.Express) {
  const server: Server = createServer(application);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}

const servers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

async function requestProfile(
  options: Parameters<typeof createTestApp>[0] = {},
  body: unknown = {},
) {
  const context = createTestApp(options);
  const server = await startTestServer(context.app);
  servers.push(server);

  const response = await fetch(`${server.url}/api/auth/profile`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer test-token",
    },
    body: JSON.stringify(body),
  });

  return { response, context };
}

test("rejects an unverified Neon Auth account", async () => {
  const { response } = await requestProfile({
    authUser: makeAuthUser({ emailVerified: false }),
  });

  assert.equal(response.status, 403);
  assert.equal(
    (await response.json()).message,
    "A verified email address is required.",
  );
});

test("rejects an actively banned Neon Auth account", async () => {
  const { response } = await requestProfile({
    authUser: makeAuthUser({ isActivelyBanned: true }),
  });

  assert.equal(response.status, 403);
  assert.equal(
    (await response.json()).message,
    "This Neon Auth account is currently banned.",
  );
});

test("creates a customer profile for a verified account", async () => {
  const { response, context } = await requestProfile();

  assert.equal(response.status, 201);

  const body = await response.json();

  assert.equal(body.status, "success");
  assert.equal(body.data.email, "test@example.com");
  assert.equal(body.data.firstName, "Test");
  assert.equal(body.data.lastName, "Customer");
  assert.equal(body.data.role, "customer");
  assert.equal(context.getCreateCount(), 1);
});

test("does not allow the client to assign an admin role", async () => {
  const { response, context } = await requestProfile({}, {
    role: "admin",
    email: "someone-else@example.com",
    neonAuthUserId: "someone-else",
  });

  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.role, "customer");
  assert.equal(
    context.getCreatedProfile()?.neonAuthUserId,
    neonUserId,
  );
  assert.equal(
    context.getCreatedProfile()?.email,
    "test@example.com",
  );
});

test("rejects an existing email that is not linked to this identity", async () => {
  const { response, context } = await requestProfile({
    emailProfile: makeProfile({
      id: "existing-profile",
      neonAuthUserId: null,
    }),
  });

  assert.equal(response.status, 409);
  assert.equal(context.getCreateCount(), 0);
});

test("rejects an inactive linked profile", async () => {
  const { response, context } = await requestProfile({
    linkedProfile: makeProfile({ isActive: false }),
  });

  assert.equal(response.status, 403);
  assert.equal(context.getCreateCount(), 0);
});

test("returns an existing linked profile without creating another", async () => {
  const existing = makeProfile();
  const { response, context } = await requestProfile({
    linkedProfile: existing,
  });

  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.data.id, existing.id);
  assert.equal(body.data.role, "customer");
  assert.equal(context.getCreateCount(), 0);
});

test("rejects accounts without a usable first and last name", async () => {
  const { response, context } = await requestProfile({
    authUser: makeAuthUser({ name: "Customer" }),
  });

  assert.equal(response.status, 422);
  assert.equal(context.getCreateCount(), 0);
});
