import express from "express";
import { body, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting dla endpointów
const configLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Przekroczono limit prób aktualizacji konfiguracji.",
});

const validateChatInput = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Wiadomość nie może być pusta")
    .isLength({ max: 1000 })
    .withMessage("Wiadomość jest zbyt długa")
    .escape(),
];

export function createChatRouter(chatController, moderationController) {
  // Endpoint do wysyłania wiadomości
  router.post("/chat", validateChatInput, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { message } = req.body;

      if (!(await moderationController.isContentAppropriate(message))) {
        return res.status(400).json({
          error:
            "Przepraszam, ale twoje pytanie zawiera niedozwolone słowa. Proszę o kulturalną komunikację.",
        });
      }

      const cachedResponse = await chatController.checkCache(message);
      if (cachedResponse) {
        console.log("\n[Cache]: === ODPOWIEDŹ Z CACHE ===");
        return res.json({ reply: cachedResponse });
      }

      const finalResponse = await chatController.processMessage(message);
      res.json({ reply: finalResponse });
    } catch (error) {
      console.log("\n[Error]: === BŁĄD PRZETWARZANIA ===");
      console.error(`[Error]: ${error}`);
      console.log("[Error]: ========================\n");
      res.status(500).json({
        error: "Wystąpił błąd podczas przetwarzania wiadomości",
        details: error.message,
      });
    }
  });

  // Endpoint do pobierania konfiguracji
  router.get("/config", (req, res) => {
    res.json(chatController.getConfig());
  });

  // Endpoint do aktualizacji konfiguracji
  router.post(
    "/update-config",
    configLimiter,
    [
      body("temperature")
        .isFloat({ min: 0, max: 1 })
        .withMessage("Temperatura musi być wartością między 0 a 1"),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      try {
        const { temperature } = req.body;
        if (
          typeof temperature !== "number" ||
          temperature < 0 ||
          temperature > 1
        ) {
          return res.status(400).json({
            error:
              "Nieprawidłowa wartość temperatury. Wartość musi być między 0 a 1.",
          });
        }

        chatController.updateConfig({ temperature });

        res.json({
          message: "Zaktualizowano konfigurację",
          newConfig: chatController.getConfig(),
        });
      } catch (error) {
        console.error(
          "[ChatBot]: Błąd podczas aktualizacji konfiguracji:",
          error
        );
        res.status(500).json({
          error: "Wystąpił błąd podczas aktualizacji konfiguracji",
          details: error.message,
        });
      }
    }
  );

  // Endpoint do pobierania FAQ
  router.get("/faq", async (req, res) => {
    try {
      const faq = await chatController.getFAQ();
      res.json(faq);
    } catch (error) {
      res.status(500).json({
        error: "Błąd podczas pobierania FAQ",
        details: error.message,
      });
    }
  });

  return router;
}
