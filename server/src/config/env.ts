import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env");
dotenv.config({ path: envPath });

const DEFAULT_PORT = 5000;

export type CookieSameSite = "lax" | "strict" | "none";

export interface AuthConfig {
  corsOrigins: string[];
  cookieName: string;
  csrfCookieName: string;
  cookieSecure: boolean;
  cookieSameSite: CookieSameSite;
  sessionDurationMs: number;
}

export function getPort(value = process.env.PORT): number {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

export function getDatabaseUrl(value = process.env.DATABASE_URL): string {
  if (value === undefined || value.trim() === "") {
    throw new Error("DATABASE_URL is required.");
  }

  return value.trim();
}

export function getAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthConfig {
  const isProduction = env.NODE_ENV === "production";
  const origins = env.CORS_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if ((!origins || origins.length === 0) && isProduction) {
    throw new Error("CORS_ORIGINS must be configured in production.");
  }

  const corsOrigins = origins?.map((origin) => {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error("CORS_ORIGINS must contain valid origin URLs.");
    }

    if (
      parsed.origin !== origin ||
      (parsed.protocol !== "https:" && parsed.hostname !== "localhost")
    ) {
      throw new Error(
        "CORS_ORIGINS must contain HTTPS origins (localhost may use HTTP).",
      );
    }

    return parsed.origin;
  }) ?? ["http://localhost:5173"];

  const sameSiteValue = env.SESSION_COOKIE_SAME_SITE?.toLowerCase() ?? "lax";
  if (
    sameSiteValue !== "lax" &&
    sameSiteValue !== "strict" &&
    sameSiteValue !== "none"
  ) {
    throw new Error(
      "SESSION_COOKIE_SAME_SITE must be lax, strict, or none.",
    );
  }

  const secureValue = env.SESSION_COOKIE_SECURE;
  const cookieSecure =
    secureValue === undefined ? isProduction : secureValue === "true";
  if (
    secureValue !== undefined &&
    secureValue !== "true" &&
    secureValue !== "false"
  ) {
    throw new Error("SESSION_COOKIE_SECURE must be true or false.");
  }
  if (isProduction && !cookieSecure) {
    throw new Error("SESSION_COOKIE_SECURE must be true in production.");
  }
  if (sameSiteValue === "none" && !cookieSecure) {
    throw new Error("SESSION_COOKIE_SECURE must be true when SameSite is none.");
  }

  const cookieName = env.SESSION_COOKIE_NAME?.trim() || "emmanex_session";
  const csrfCookieName = env.CSRF_COOKIE_NAME?.trim() || "emmanex_csrf";
  if (
    !/^[A-Za-z0-9_-]+$/.test(cookieName) ||
    !/^[A-Za-z0-9_-]+$/.test(csrfCookieName) ||
    cookieName === csrfCookieName
  ) {
    throw new Error("Cookie names must be distinct and contain only letters, numbers, underscores, or hyphens.");
  }

  return {
    corsOrigins,
    cookieName,
    csrfCookieName,
    cookieSecure,
    cookieSameSite: sameSiteValue,
    sessionDurationMs: 7 * 24 * 60 * 60 * 1000,
  };
}
