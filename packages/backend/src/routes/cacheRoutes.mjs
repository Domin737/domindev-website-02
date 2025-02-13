import express from "express";
import { body, validationResult } from "express-validator";
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
  router.post(
    "/cache/clear",
    configLimiter,
    [
      body("strategy")
        .optional()
        .isIn(["all", "temperature", "expired"])
        .withMessage("Nieprawidłowa strategia czyszczenia"),
      body("temperature")
        .optional()
        .isFloat({ min: 0, max: 1 })
        .withMessage("Temperatura musi być wartością między 0 a 1"),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { strategy = "expired", temperature } = req.body;
        const result = await cacheController.clearCache(strategy, temperature);
        res.json(result);
      } catch (error) {
        console.error("[Cache]: Błąd podczas czyszczenia cache:", error);
        res.status(500).json({
          error: "Błąd podczas czyszczenia cache",
          details: error.message,
        });
      }
    }
  );

  // Endpoint do czyszczenia starych danych
  router.post("/cache/cleanup", configLimiter, async (req, res) => {
    try {
      const result = await cacheController.cleanupOldData();
      res.json(result);
    } catch (error) {
      console.error("[Cache]: Błąd podczas czyszczenia starych danych:", error);
      res.status(500).json({
        error: "Błąd podczas czyszczenia starych danych",
        details: error.message,
      });
    }
  });

  return router;
}
