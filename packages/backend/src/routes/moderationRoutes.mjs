import express from "express";
import { body, param, validationResult } from "express-validator";
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

// Middleware do walidacji
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export function createModerationRouter(moderationController) {
  // Endpoint do dodawania zabronionych słów
  router.post(
    "/api/banned-words",
    bannedWordsLimiter,
    [
      body("word")
        .trim()
        .notEmpty()
        .withMessage("Słowo nie może być puste")
        .isLength({ max: 50 })
        .withMessage("Słowo nie może być dłuższe niż 50 znaków"),
    ],
    validateRequest,
    moderationController.addBannedWord.bind(moderationController)
  );

  // Endpoint do usuwania zabronionych słów
  router.delete(
    "/api/banned-words/:word",
    bannedWordsLimiter,
    [
      param("word")
        .trim()
        .notEmpty()
        .withMessage("Słowo nie może być puste")
        .isLength({ max: 50 })
        .withMessage("Słowo nie może być dłuższe niż 50 znaków"),
    ],
    validateRequest,
    moderationController.removeBannedWord.bind(moderationController)
  );

  // Endpoint do pobierania listy zabronionych słów
  router.get(
    "/api/banned-words",
    bannedWordsGetLimiter,
    moderationController.getBannedWords.bind(moderationController)
  );

  // Nowy endpoint do sprawdzania tekstu
  router.post(
    "/api/check-content",
    bannedWordsLimiter,
    [
      body("text")
        .trim()
        .notEmpty()
        .withMessage("Tekst nie może być pusty")
        .isLength({ max: 1000 })
        .withMessage("Tekst nie może być dłuższy niż 1000 znaków"),
    ],
    validateRequest,
    moderationController.checkContent.bind(moderationController)
  );

  return router;
}
