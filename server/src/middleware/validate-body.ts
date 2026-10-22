import type { RequestHandler } from "express";
import { HttpError } from "./error-handler.js";

export function validateBody<T>(
  isValid: (body: unknown) => body is T,
): RequestHandler {
  return (req, _res, next) => {
    if (!isValid(req.body)) {
      next(new HttpError(400, "Request body is invalid."));
      return;
    }

    next();
  };
}
