import express from "express";
import { query, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting dla operacji na cache
const configLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Przekroczono limit operacji na cache.",
});

export function createCacheRouter(cacheController) {
  // Endpoint do ręcznego czyszczenia cache
  router.get(
    "/cache/clear",
    configLimiter,
    [
      query("strategy")
        .optional()
        .isIn(["all", "temperature", "expired"])
        .withMessage("Nieprawidłowa strategia czyszczenia"),
      query("temperature")
        .optional()
        .isFloat({ min: 0, max: 1 })
        .withMessage("Temperatura musi być wartością między 0 a 1"),
    ],
    async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      next();
    },
    cacheController.clearCache.bind(cacheController)
  );

  // Endpoint do czyszczenia starych danych
  router.post(
    "/cache/cleanup",
    configLimiter,
    cacheController.cleanupOldData.bind(cacheController)
  );

  return router;
}
