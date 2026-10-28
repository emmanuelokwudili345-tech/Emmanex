
import cors from "cors";
import express from "express";
import { successResponse } from "./api-response.js";
import { getAuthConfig } from "./config/env.js";
import { checkDatabaseConnection } from "./db/health.js";
import {
  errorHandler,
  HttpError,
  notFoundHandler,
} from "./middleware/error-handler.js";
import { createProfileRouter } from "./modules/auth/profile-routes.js";

export function createApp(
  checkDatabase: () => Promise<void> = checkDatabaseConnection,
) {
  const app = express();
  const config = getAuthConfig();

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

  app.use(express.json());

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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp();
