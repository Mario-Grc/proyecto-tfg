import type { ErrorRequestHandler } from "express";

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const details = error instanceof HttpError ? error.details : undefined;

  if (statusCode >= 500) {
    console.error("[backend] unhandled error", error);
  }

  res.status(statusCode).json({
    error: error.message || "Internal server error",
    details,
  });
};
