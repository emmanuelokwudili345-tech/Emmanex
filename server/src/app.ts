
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import express from "express";
import helmet from "helmet";
import { successResponse } from "./api-response.js";
import { getAuthConfig } from "./config/env.js";
import { checkDatabaseConnection } from "./db/health.js";
import {
  errorHandler,
  HttpError,
  notFoundHandler,
} from "./middleware/error-handler.js";
import { createProfileRouter } from "./modules/auth/profile-routes.js";
import { createCatalogRouter } from "./modules/catalog/catalog-routes.js";
import { createShoppingRouter } from "./modules/shopping/shopping-routes.js";
import { createOrderRouter } from "./modules/orders/order-routes.js";

export function createApp(
  checkDatabase: () => Promise<void> = checkDatabaseConnection,
) {
  const app = express();
  const config = getAuthConfig();

  // Only trust forwarded client IP headers when the deployment's proxy hop
  // count has been explicitly configured.
  app.set("trust proxy", config.trustProxyHops ?? 0);

  app.use(helmet());

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new HttpError(403, "Request origin is not allowed."));
      },
      credentials: true,
    }),
  );

  const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith("/health"),
    message: {
      status: "error",
      message: "Too many requests. Please try again later.",
    },
  });

  const writeRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) =>
      ["GET", "HEAD", "OPTIONS"].includes(req.method) ||
      req.path.startsWith("/health"),
    message: {
      status: "error",
      message: "Too many changes. Please wait before trying again.",
    },
  });

  app.use("/api", apiRateLimit, writeRateLimit);
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/health", (_req, res) => {
    res.json(
      successResponse("Emmanex API is running", { status: "ok" }),
    );
  });

  app.get("/api/health/ready", async (_req, res, next) => {
    try {
      await checkDatabase();
    } catch {
      next(new HttpError(503, "Database unavailable."));
      return;
    }

    res.json(
      successResponse("Emmanex API is ready", { status: "ok" }),
    );
  });

  app.use("/api/auth", createProfileRouter());
  app.use("/api", createCatalogRouter());
  app.use("/api", createShoppingRouter());
  app.use("/api", createOrderRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp();
