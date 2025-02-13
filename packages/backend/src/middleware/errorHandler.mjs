export const errorHandler = (err, req, res, next) => {
  console.error("[Error Handler]:", err);

  // Jeśli błąd ma już ustawiony status, użyj go, w przeciwnym razie ustaw 500
  const statusCode = err.statusCode || 500;

  // Przygotuj standardową strukturę odpowiedzi błędu
  const errorResponse = {
    error: err.message || "Wystąpił nieoczekiwany błąd",
    status: statusCode,
    timestamp: new Date().toISOString(),
  };

  // Dodaj szczegóły błędu w trybie development
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  res.status(statusCode).json(errorResponse);
};

// Middleware do obsługi błędów 404 (Not Found)
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: "Nie znaleziono zasobu",
    status: 404,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
};

// Klasa do tworzenia błędów aplikacyjnych
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}
