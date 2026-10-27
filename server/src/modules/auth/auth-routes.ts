import { Router, type CookieOptions, type Response } from "express";
import { successResponse } from "../../api-response.js";
import type { AuthConfig } from "../../config/env.js";
import { HttpError } from "../../middleware/error-handler.js";
import { createAuthRateLimit } from "./auth-rate-limit.js";
import {
  getSessionCookie,
  requireAuth,
  requireAuthenticatedMutation,
} from "./auth-middleware.js";
import { requireTrustedOrigin } from "./csrf.js";
import { requireNeonAuth } from "./neon-auth-middleware.js";
import type { AuthOperations } from "./auth-types.js";
import { parseLoginInput, parseRegistrationInput } from "./auth-validation.js";

const SESSION_COOKIE_PATH = "/";

function cookieOptions(config: AuthConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: SESSION_COOKIE_PATH,
    maxAge: config.sessionDurationMs,
  };
}

function csrfCookieOptions(config: AuthConfig): CookieOptions {
  return {
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: SESSION_COOKIE_PATH,
    maxAge: config.sessionDurationMs,
  };
}

function clearAuthCookies(
  res: Response,
  config: AuthConfig,
): void {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: SESSION_COOKIE_PATH,
  });
  res.clearCookie(config.csrfCookieName, {
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: SESSION_COOKIE_PATH,
  });
}

export function createAuthRouter(
  auth: AuthOperations,
  config: AuthConfig,
) {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  const trustedOrigin = requireTrustedOrigin(config.corsOrigins);
  const authenticate = requireAuth(auth, config.cookieName);
  const authenticatedMutation = requireAuthenticatedMutation(auth, config);
  const authRateLimit = createAuthRateLimit();
  const authenticateWithNeon = requireNeonAuth(config);

  router.post("/register", authRateLimit, trustedOrigin, async (req, res) => {
    const session = await auth.register(parseRegistrationInput(req.body));
    res.cookie(config.cookieName, session.token, cookieOptions(config));
    res.cookie(config.csrfCookieName, session.csrfToken, csrfCookieOptions(config));
    res.status(201).json(
      successResponse("Account created.", { user: session.user }),
    );
  });

  router.post("/login", authRateLimit, trustedOrigin, async (req, res) => {
    const session = await auth.login(parseLoginInput(req.body));
    res.cookie(config.cookieName, session.token, cookieOptions(config));
    res.cookie(config.csrfCookieName, session.csrfToken, csrfCookieOptions(config));
    res.json(successResponse("Signed in.", { user: session.user }));
  });

  router.post(
    "/logout",
    ...authenticatedMutation,
    async (req, res) => {
      const token = getSessionCookie(req, config.cookieName);
      if (!token) {
        throw new HttpError(401, "Authentication is required.");
      }
      await auth.logout(token);
      clearAuthCookies(res, config);
      res.json(successResponse("Signed out.", { signedOut: true }));
    },
  );

  router.get("/csrf", authenticate, async (req, res) => {
    if (!req.authSession) {
      throw new HttpError(401, "Authentication is required.");
    }

    const csrfToken = await auth.rotateCsrfToken(req.authSession.tokenHash);
    res.cookie(config.csrfCookieName, csrfToken, csrfCookieOptions(config));
    res.json(successResponse("CSRF token issued.", { csrfToken }));
  });

  router.get("/neon/me", authenticateWithNeon, (req, res) => {
    if (!req.neonAuthUser) {
      throw new HttpError(401, "Authentication is required.");
    }

    res.json(
      successResponse("Neon Auth identity verified.", {
        user: req.neonAuthUser,
      }),
    );
  });

  router.get("/me", authenticate, (req, res) => {
    if (!req.authSession) {
      throw new HttpError(401, "Authentication is required.");
    }
    res.json(successResponse("Current user.", { user: req.authSession.user }));
  });

  return router;
}
