import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { HttpError } from "../../middleware/error-handler.js";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function csrfTokenMatches(token: string | undefined, expectedHash: string): boolean {
  if (!token || !/^[a-f0-9]{64}$/i.test(expectedHash)) {
    return false;
  }

  const actualHash = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actualHash.length === expected.length && timingSafeEqual(actualHash, expected);
}

export function requireTrustedOrigin(origins: string[]): RequestHandler {
  const allowed = new Set(origins);

  return (req, _res, next) => {
    const origin = req.get("origin");
    if (!origin || !allowed.has(origin)) {
      next(new HttpError(403, "Request origin is not allowed."));
      return;
    }

    next();
  };
}

export function requireCsrfToken(
  csrfCookieName = "emmanex_csrf",
): RequestHandler {
  return (req, _res, next) => {
    const session = req.authSession;
    const csrfCookie = readCookie(req.headers.cookie, csrfCookieName);
    const headerToken = req.get("x-csrf-token");
    if (
      !session ||
      !headerToken ||
      !safeEqual(headerToken, csrfCookie) ||
      !csrfTokenMatches(headerToken, session.csrfTokenHash)
    ) {
      next(new HttpError(403, "A valid CSRF token is required."));
      return;
    }

    next();
  };
}

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator >= 0 && part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
  }

  return null;
}

function safeEqual(first: string, second: string | null): boolean {
  if (!second) return false;
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return (
    firstBuffer.length === secondBuffer.length &&
    timingSafeEqual(firstBuffer, secondBuffer)
  );
}
