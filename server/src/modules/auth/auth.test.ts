import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import { getAuthConfig, type AuthConfig } from "../../config/env.js";
import { createApp } from "../../app.js";
import type {
  AuthRepository,
  NewSession,
  PublicUser,
  RegistrationInput,
  SessionPrincipal,
  StoredUser,
} from "./auth-types.js";
import { AuthService } from "./auth-service.js";
import { hashToken } from "./csrf.js";
import { hashPassword, verifyPassword } from "./password.js";

const authConfig: AuthConfig = {
  corsOrigins: ["http://localhost:5173"],
  cookieName: "emmanex_session",
  csrfCookieName: "emmanex_csrf",
  cookieSecure: false,
  cookieSameSite: "lax",
  sessionDurationMs: 60_000,
};

class MemoryAuthRepository implements AuthRepository {
  readonly users = new Map<string, StoredUser>();
  readonly sessions = new Map<string, SessionPrincipal>();

  async createUser(
    input: Omit<RegistrationInput, "password"> & { passwordHash: string },
  ): Promise<PublicUser> {
    const user: StoredUser = {
      id: "user-1",
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      role: "customer",
      passwordHash: input.passwordHash,
      isActive: true,
    };
    this.users.set(user.email, user);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
  }

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    return this.users.get(email) ?? null;
  }

  async createSession(session: NewSession): Promise<void> {
    const user = [...this.users.values()].find(
      (candidate) => candidate.id === session.userId,
    );
    assert.ok(user);
    this.sessions.set(session.tokenHash, {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      tokenHash: session.tokenHash,
      csrfTokenHash: session.csrfTokenHash,
      expiresAt: session.expiresAt,
    });
  }

  async findActiveSession(
    tokenHash: string,
    now: Date,
  ): Promise<SessionPrincipal | null> {
    const session = this.sessions.get(tokenHash);
    if (!session || session.expiresAt <= now) return null;
    return session;
  }

  async updateCsrfTokenHash(
    tokenHash: string,
    csrfTokenHash: string,
  ): Promise<boolean> {
    const session = this.sessions.get(tokenHash);
    if (!session) return false;
    session.csrfTokenHash = csrfTokenHash;
    return true;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }
}

async function listen(application: ReturnType<typeof createApp>) {
  const server: Server = createServer(application);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function makeAuthApp() {
  const repository = new MemoryAuthRepository();
  const service = new AuthService(
    repository,
    authConfig.sessionDurationMs,
  );
  return {
    repository,
    server: listen(
      createApp(async () => {}, { service, config: authConfig }),
    ),
  };
}

function cookieValue(setCookie: string, name: string): string {
  const match = setCookie.match(new RegExp(`(?:^|, )${name}=([^;]*)`));
  assert.ok(match);
  return match[1];
}

test("password hashes are salted and verify without storing plaintext", async () => {
  const firstHash = await hashPassword("correct horse battery staple");
  const secondHash = await hashPassword("correct horse battery staple");

  assert.notEqual(firstHash, secondHash);
  assert.notEqual(firstHash, "correct horse battery staple");
  assert.equal(await verifyPassword("correct horse battery staple", firstHash), true);
  assert.equal(await verifyPassword("incorrect password", firstHash), false);
});

test("registration, login, current user, CSRF-protected logout, and invalidation work", async () => {
  const { repository, server } = makeAuthApp();
  const running = await server;

  try {
    const registration = await fetch(`${running.url}/api/auth/register`, {
      method: "POST",
      headers: {
        origin: authConfig.corsOrigins[0],
        "content-type": "application/json",
      },
      body: JSON.stringify({
        firstName: "Ada",
        lastName: "Lovelace",
        email: " ADA@example.com ",
        password: "a secure password 123",
        role: "admin",
      }),
    });

    assert.equal(registration.status, 201);
    const registrationBody = await registration.json();
    assert.deepEqual(registrationBody.data.user, {
      id: "user-1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      role: "customer",
    });
    assert.equal(JSON.stringify(registrationBody).includes("passwordHash"), false);

    const cookieHeader = registration.headers.get("set-cookie");
    assert.ok(cookieHeader);
    const sessionToken = cookieValue(cookieHeader, authConfig.cookieName);
    const csrfToken = cookieValue(cookieHeader, authConfig.csrfCookieName);
    assert.match(cookieHeader, /emmanex_session=.*HttpOnly/i);
    assert.equal(repository.users.get("ada@example.com")?.passwordHash.includes(
      "a secure password 123",
    ), false);
    assert.equal(
      repository.sessions.has(hashToken(sessionToken)),
      true,
    );

    const login = await fetch(`${running.url}/api/auth/login`, {
      method: "POST",
      headers: {
        origin: authConfig.corsOrigins[0],
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "ADA@example.com",
        password: "a secure password 123",
      }),
    });
    assert.equal(login.status, 200);

    const currentUser = await fetch(`${running.url}/api/auth/me`, {
      headers: { cookie: `${authConfig.cookieName}=${sessionToken}` },
    });
    assert.equal(currentUser.status, 200);
    assert.equal((await currentUser.json()).data.user.email, "ada@example.com");

    const logoutWithoutCsrf = await fetch(`${running.url}/api/auth/logout`, {
      method: "POST",
      headers: {
        origin: authConfig.corsOrigins[0],
        cookie: `${authConfig.cookieName}=${sessionToken}; ${authConfig.csrfCookieName}=${csrfToken}`,
      },
    });
    assert.equal(logoutWithoutCsrf.status, 403);

    const logout = await fetch(`${running.url}/api/auth/logout`, {
      method: "POST",
      headers: {
        origin: authConfig.corsOrigins[0],
        cookie: `${authConfig.cookieName}=${sessionToken}; ${authConfig.csrfCookieName}=${csrfToken}`,
        "x-csrf-token": csrfToken,
      },
    });
    assert.equal(logout.status, 200);
    assert.equal(repository.sessions.has(hashToken(sessionToken)), false);

    const invalidated = await fetch(`${running.url}/api/auth/me`, {
      headers: { cookie: `${authConfig.cookieName}=${sessionToken}` },
    });
    assert.equal(invalidated.status, 401);
  } finally {
    await running.close();
  }
});

test("session validation denies unauthenticated requests", async () => {
  const { server } = makeAuthApp();
  const running = await server;

  try {
    const response = await fetch(`${running.url}/api/auth/me`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      status: "error",
      message: "Authentication is required.",
    });
  } finally {
    await running.close();
  }
});

test("auth rejects invalid registration input and untrusted origins", async () => {
  const { server } = makeAuthApp();
  const running = await server;

  try {
    const invalid = await fetch(`${running.url}/api/auth/register`, {
      method: "POST",
      headers: {
        origin: authConfig.corsOrigins[0],
        "content-type": "application/json",
      },
      body: JSON.stringify({
        firstName: "A",
        lastName: "B",
        email: "not-an-email",
        password: "short",
      }),
    });
    assert.equal(invalid.status, 400);

    const untrusted = await fetch(`${running.url}/api/auth/register`, {
      method: "POST",
      headers: {
        origin: "https://untrusted.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        password: "a secure password 123",
      }),
    });
    assert.equal(untrusted.status, 403);
  } finally {
    await running.close();
  }
});

test("session expiry invalidates authentication", async () => {
  const repository = new MemoryAuthRepository();
  let now = new Date("2026-01-01T00:00:00.000Z");
  const service = new AuthService(
    repository,
    1_000,
    () => now,
  );
  const session = await service.register({
    firstName: "Grace",
    lastName: "Hopper",
    email: "grace@example.com",
    password: "a secure password 456",
  });

  assert.ok(await service.authenticate(session.token));
  now = new Date(now.getTime() + 1_001);
  assert.equal(await service.authenticate(session.token), null);
});

test("production auth config requires HTTPS origins and secure cookies", () => {
  const config = getAuthConfig({
    NODE_ENV: "production",
    CORS_ORIGINS: "https://store.example",
  });
  assert.equal(config.cookieSecure, true);
  assert.deepEqual(config.corsOrigins, ["https://store.example"]);
  assert.throws(
    () =>
      getAuthConfig({
        NODE_ENV: "production",
        CORS_ORIGINS: "https://store.example",
        SESSION_COOKIE_SECURE: "false",
      }),
    /SESSION_COOKIE_SECURE must be true in production/,
  );
});
