import express from "express";
import { body, query, validationResult } from "express-validator";
import { ChatErrorCode } from "@domindev-website-02/shared/dist/types/chat.js";
import { AppError } from "../middleware/errorHandler.mjs";

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    const code = firstError.msg.includes("długa")
      ? ChatErrorCode.MESSAGE_TOO_LONG
      : ChatErrorCode.EMPTY_MESSAGE;
    throw new AppError(firstError.msg, 400, {
      code,
      details: { validation: errors.array() },
    });
  }
  next();
};

export const createChatRouter = (chatController, moderationController) => {
  const router = express.Router();

  // Middleware do walidacji wiadomości
  const validateMessage = [
    body("message")
      .trim()
      .notEmpty()
      .withMessage("Wiadomość nie może być pusta")
      .isLength({ max: 1000 })
      .withMessage("Wiadomość jest zbyt długa (max 1000 znaków)"),
    validateRequest,
  ];

  // Middleware do walidacji konfiguracji
  const validateConfig = [
    body("temperature")
      .optional()
      .isFloat({ min: 0, max: 2 })
      .withMessage("Temperatura musi być wartością między 0 a 2"),
    body("max_tokens")
      .optional()
      .isInt({ min: 100, max: 4000 })
      .withMessage("max_tokens musi być wartością między 100 a 4000"),
    validateRequest,
  ];

  // Middleware do walidacji parametrów FAQ
  const validateFAQParams = [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit musi być wartością między 1 a 50"),
    validateRequest,
  ];

  // Middleware do walidacji parametrów statystyk
  const validateStatsParams = [
    query("question")
      .trim()
      .notEmpty()
      .withMessage("Parametr 'question' jest wymagany"),
    validateRequest,
  ];

  // Endpointy chatu
  router.post(
    "/api/chat",
    validateMessage,
    moderationController.moderateMessage.bind(moderationController),
    chatController.processMessage.bind(chatController)
  );

  // Endpointy FAQ i statystyk
  router.get(
    "/api/chat/faq",
    validateFAQParams,
    chatController.getFAQ.bind(chatController)
  );
  router.get(
    "/api/chat/stats",
    validateStatsParams,
    chatController.getQuestionStats.bind(chatController)
  );
  router.delete(
    "/api/chat/stats",
    chatController.clearStats.bind(chatController)
  );

  // Endpointy konfiguracji
  router.get("/api/chat/config", chatController.getConfig.bind(chatController));
  router.put(
    "/api/chat/config",
    validateConfig,
    chatController.updateConfig.bind(chatController)
  );

  return router;
};
