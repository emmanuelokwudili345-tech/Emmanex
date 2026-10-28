import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env");
dotenv.config({ path: envPath });

const DEFAULT_PORT = 5000;

export interface AuthConfig {
  corsOrigins: string[];
  neonAuthBaseUrl?: string;
  neonAuthJwksUrl?: string;
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

  const corsOrigins =
    origins?.map((origin) => {
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

  const neonAuthBaseUrl = env.NEON_AUTH_BASE_URL?.trim();
  const neonAuthJwksUrl = env.NEON_AUTH_JWKS_URL?.trim();

  if (Boolean(neonAuthBaseUrl) !== Boolean(neonAuthJwksUrl)) {
    throw new Error(
      "NEON_AUTH_BASE_URL and NEON_AUTH_JWKS_URL must be configured together.",
    );
  }

  if (neonAuthBaseUrl && neonAuthJwksUrl) {
    for (const [name, value] of [
      ["NEON_AUTH_BASE_URL", neonAuthBaseUrl],
      ["NEON_AUTH_JWKS_URL", neonAuthJwksUrl],
    ] as const) {
      let parsed: URL;

      try {
        parsed = new URL(value);
      } catch {
        throw new Error(`${name} must be a valid URL.`);
      }

      if (
        parsed.protocol !== "https:" &&
        !(parsed.protocol === "http:" && parsed.hostname === "localhost")
      ) {
        throw new Error(
          `${name} must use HTTPS (localhost may use HTTP).`,
        );
      }
    }
  }

  return {
    corsOrigins,
    ...(neonAuthBaseUrl && neonAuthJwksUrl
      ? { neonAuthBaseUrl, neonAuthJwksUrl }
      : {}),
  };
}
