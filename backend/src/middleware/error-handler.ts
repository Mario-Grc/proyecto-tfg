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
  const errorWithStatus = error as { status?: number; statusCode?: number; expose?: boolean };
  const externalStatus =
    typeof errorWithStatus.statusCode === "number"
      ? errorWithStatus.statusCode
      : typeof errorWithStatus.status === "number"
      ? errorWithStatus.status
      : undefined;

  const statusCode =
    error instanceof HttpError
      ? error.statusCode
      : externalStatus && externalStatus >= 400 && externalStatus < 600
      ? externalStatus
      : 500;

  const isControlledHttpError = error instanceof HttpError;
  const details = error instanceof HttpError ? error.details : undefined;
  const message = isControlledHttpError
    ? error.message
    : statusCode >= 500
    ? "Internal server error"
    : error instanceof Error
    ? error.message
    : "Request error";

  if (statusCode >= 500 && !isControlledHttpError) {
    console.error("[backend] unhandled error", error);
  }

  res.status(statusCode).json({
    error: message,
    details,
  });
};
