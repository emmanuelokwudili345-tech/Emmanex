import type { ErrorRequestHandler, RequestHandler } from "express";
import { errorResponse } from "../api-response.js";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, "Route not found."));
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json(errorResponse(error.message));
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  ) {
    res.status(400).json(errorResponse("Request body contains invalid JSON."));
    return;
  }

  console.error("Unhandled request error.");
  res.status(500).json(errorResponse("An unexpected error occurred."));
};
