import type { Request, RequestHandler } from "express";
import { HttpError } from "../../middleware/error-handler.js";
import { requireCsrfToken, requireTrustedOrigin } from "./csrf.js";
import type { AuthOperations, SessionPrincipal } from "./auth-types.js";

declare global {
  namespace Express {
    interface Request {
      authSession?: SessionPrincipal;
    }
  }
}

export function getSessionCookie(
  request: Request,
  cookieName: string,
): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== cookieName) {
      continue;
    }

    try {
      const token = decodeURIComponent(part.slice(separator + 1).trim());
      return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
    } catch {
      return null;
    }
  }

  return null;
}

export function requireAuth(
  authService: AuthOperations,
  cookieName: string,
): RequestHandler {
  return async (req, _res, next) => {
    const token = getSessionCookie(req, cookieName);
    if (!token) {
      next(new HttpError(401, "Authentication is required."));
      return;
    }

    const session = await authService.authenticate(token);
    if (!session) {
      next(new HttpError(401, "Authentication is required."));
      return;
    }

    req.authSession = session;
    next();
  };
}

export function requireAuthenticatedMutation(
  authService: AuthOperations,
  config: {
    cookieName: string;
    csrfCookieName: string;
    corsOrigins: string[];
  },
): RequestHandler[] {
  return [
    requireAuth(authService, config.cookieName),
    requireTrustedOrigin(config.corsOrigins),
    requireCsrfToken(config.csrfCookieName),
  ];
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.authSession) {
    next(new HttpError(401, "Authentication is required."));
    return;
  }

  if (req.authSession.user.role !== "admin") {
    next(new HttpError(403, "Administrator access is required."));
    return;
  }

  next();
};
