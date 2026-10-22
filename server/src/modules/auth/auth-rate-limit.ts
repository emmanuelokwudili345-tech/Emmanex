import type { RequestHandler } from "express";
import { errorResponse } from "../../api-response.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createAuthRateLimit(
  options: {
    limit?: number;
    windowMs?: number;
    now?: () => number;
  } = {},
): RequestHandler {
  const limit = options.limit ?? 10;
  const windowMs = options.windowMs ?? 15 * 60 * 1000;
  const now = options.now ?? Date.now;
  const attempts = new Map<string, RateLimitEntry>();
  let requestsSinceCleanup = 0;

  return (req, res, next) => {
    const currentTime = now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let entry = attempts.get(key);

    if (!entry || entry.resetAt <= currentTime) {
      entry = { count: 0, resetAt: currentTime + windowMs };
      attempts.set(key, entry);
    }

    entry.count += 1;

    requestsSinceCleanup += 1;
    if (requestsSinceCleanup >= 256 || attempts.size > 10_000) {
      for (const [address, value] of attempts) {
        if (value.resetAt <= currentTime) {
          attempts.delete(address);
        }
      }
      while (attempts.size > 10_000) {
        const oldestAddress = attempts.keys().next().value;
        if (oldestAddress === undefined) break;
        attempts.delete(oldestAddress);
      }
      requestsSinceCleanup = 0;
    }

    if (entry.count > limit) {
      res.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1000))),
      );
      res.status(429).json(errorResponse("Too many authentication attempts."));
      return;
    }

    next();
  };
}
