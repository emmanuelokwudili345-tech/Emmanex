import { createRemoteJWKSet, jwtVerify } from "jose";
import type { RequestHandler } from "express";
import type { AuthConfig } from "../../config/env.js";
import { HttpError } from "../../middleware/error-handler.js";

declare global {
  namespace Express {
    interface Request {
      neonAuthUser?: {
        id: string;
        email: string | null;
      };
    }
  }
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(url: string) {
  let jwks = jwksCache.get(url);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksCache.set(url, jwks);
  }
  return jwks;
}

export function requireNeonAuth(config: AuthConfig): RequestHandler {
  return async (req, _res, next) => {
    const baseUrl = config.neonAuthBaseUrl;
    const jwksUrl = config.neonAuthJwksUrl;

    if (!baseUrl || !jwksUrl) {
      next(new HttpError(503, "Neon Auth is not configured on the server."));
      return;
    }

    const authorization = req.get("authorization");
    const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) {
      next(new HttpError(401, "Authentication is required."));
      return;
    }

    try {
      const issuer = new URL(baseUrl).origin;
      const { payload } = await jwtVerify(match[1], getJwks(jwksUrl), {
        issuer,
        algorithms: ["EdDSA"],
      });

      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        next(new HttpError(401, "Authentication is required."));
        return;
      }

      req.neonAuthUser = {
        id: payload.sub,
        email: typeof payload.email === "string" ? payload.email : null,
      };
      next();
    } catch {
      next(new HttpError(401, "Authentication is required."));
    }
  };
}
