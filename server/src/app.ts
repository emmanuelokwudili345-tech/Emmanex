import cors from "cors";
import express from "express";
import { successResponse } from "./api-response.js";
import { getAuthConfig, type AuthConfig } from "./config/env.js";
import { checkDatabaseConnection } from "./db/health.js";
import { DrizzleAuthRepository } from "./modules/auth/auth-repository.js";
import { AuthService } from "./modules/auth/auth-service.js";
import { createAuthRouter } from "./modules/auth/auth-routes.js";
import type { AuthOperations } from "./modules/auth/auth-types.js";
import {
  errorHandler,
  HttpError,
  notFoundHandler,
} from "./middleware/error-handler.js";

export function createApp(
  checkDatabase: () => Promise<void> = checkDatabaseConnection,
  authDependencies: {
    service?: AuthOperations;
    config?: AuthConfig;
  } = {},
) {
  const app = express();
  const authConfig = authDependencies.config ?? getAuthConfig();
  const authService =
    authDependencies.service ??
    new AuthService(new DrizzleAuthRepository(), authConfig.sessionDurationMs);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || authConfig.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new HttpError(403, "Request origin is not allowed."));
      },
      credentials: true,
    }),
  );
  app.use(express.json());

  app.use("/api/auth", createAuthRouter(authService, authConfig));

  app.get("/api/health", (_req, res) => {
    res.json(successResponse("Emmanex API is running", { status: "ok" }));
  });

  app.get("/api/health/ready", async (_req, res, next) => {
    try {
      await checkDatabase();
    } catch {
      next(new HttpError(503, "Database unavailable."));
      return;
    }

    res.json(successResponse("Emmanex API is ready", { status: "ok" }));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp();
