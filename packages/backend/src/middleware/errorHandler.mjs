import { ChatErrorCode } from "@domindev-website-02/shared/dist/types/chat.js";

export class AppError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Nie znaleziono: ${req.originalUrl}`, 404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.details?.code || ChatErrorCode.SERVICE_UNAVAILABLE;

  // Logowanie błędów tylko dla błędów serwera
  if (statusCode >= 500) {
    console.error("[Error]:", {
      message: err.message,
      stack: err.stack,
      details: err.details,
      timestamp: err.timestamp || new Date().toISOString(),
    });
  }

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: err.message,
      details: err.details,
      timestamp: err.timestamp || new Date().toISOString(),
    },
  });
};
