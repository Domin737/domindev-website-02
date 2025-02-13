import express from "express";
import { body, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting dla operacji na zabronionych słowach
const bannedWordsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10000,
  message: "Przekroczono limit operacji na zabronionych słowach.",
});

// Rate limiting dla odczytu listy zabronionych słów
const bannedWordsGetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Przekroczono limit odczytów listy zabronionych słów.",
});

export function createModerationRouter(moderationController) {
  // Endpoint do dodawania zabronionych słów
  router.post(
    "/banned-words",
    bannedWordsLimiter,
    [body("word").trim().notEmpty().withMessage("Słowo nie może być puste")],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { word } = req.body;
        const result = await moderationController.addBannedWord(word);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: "Błąd podczas dodawania słowa",
          details: error.message,
        });
      }
    }
  );

  // Endpoint do usuwania zabronionych słów
  router.delete("/banned-words/:word", bannedWordsLimiter, async (req, res) => {
    try {
      const { word } = req.params;
      const result = await moderationController.removeBannedWord(word);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: "Błąd podczas usuwania słowa",
        details: error.message,
      });
    }
  });

  // Endpoint do pobierania listy zabronionych słów
  router.get("/banned-words", bannedWordsGetLimiter, async (req, res) => {
    try {
      const words = await moderationController.getBannedWords();
      res.json(words.map((word) => ({ word })));
    } catch (error) {
      res.status(500).json({
        error: "Błąd podczas pobierania listy zabronionych słów",
        details: error.message,
      });
    }
  });

  return router;
}
