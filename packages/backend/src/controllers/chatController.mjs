import { ChatErrorCode } from "@domindev-website-02/shared/dist/types/chat.js";
import { AppError } from "../middleware/errorHandler.mjs";

export class ChatController {
  constructor(chatService, chatCacheService, chatStatsService) {
    this.chatService = chatService;
    this.chatCacheService = chatCacheService;
    this.chatStatsService = chatStatsService;
  }

  async validateMessage(message) {
    if (!message || message.trim().length === 0) {
      throw new AppError("Wiadomość nie może być pusta", 400, {
        code: ChatErrorCode.EMPTY_MESSAGE,
      });
    }

    if (message.length > 1000) {
      throw new AppError("Wiadomość jest zbyt długa (max 1000 znaków)", 400, {
        code: ChatErrorCode.MESSAGE_TOO_LONG,
        details: { length: message.length, maxLength: 1000 },
      });
    }
  }

  async processMessage(req, res, next) {
    try {
      const { message } = req.body;
      await this.validateMessage(message);

      const temperature = this.chatService.getConfig().temperature;

      // Sprawdź cache
      try {
        const cachedResponse = await this.chatCacheService.checkCache(
          message,
          temperature
        );
        if (cachedResponse) {
          await this.chatStatsService.updateQuestionStats(message, temperature);
          return res.json({ reply: cachedResponse.content });
        }
      } catch (error) {
        console.error("[Cache]: Błąd podczas sprawdzania cache:", error);
        // Kontynuuj bez cache w przypadku błędu
      }

      // Generuj nową odpowiedź
      const response = await this.chatService.processMessage(message);

      // Zapisz do cache i aktualizuj statystyki równolegle
      try {
        await Promise.allSettled([
          this.chatCacheService.saveToCache(
            message,
            response.content,
            temperature
          ),
          this.chatStatsService.updateQuestionStats(message, temperature),
        ]);
      } catch (error) {
        console.error("[Cache/Stats]: Błąd podczas zapisywania:", error);
        // Kontynuuj mimo błędu cache/statystyk
      }

      res.json({ reply: response.content });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(
          new AppError("Błąd przetwarzania wiadomości", 500, {
            code: ChatErrorCode.SERVICE_UNAVAILABLE,
            details: error.message,
          })
        );
      }
    }
  }

  async getFAQ(req, res, next) {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
      const faq = await this.chatStatsService.getFAQ(limit);
      res.json(faq);
    } catch (error) {
      next(
        new AppError("Błąd pobierania FAQ", 500, {
          code: ChatErrorCode.STATS_ERROR,
          details: error.message,
        })
      );
    }
  }

  async getQuestionStats(req, res, next) {
    try {
      const { question } = req.query;
      if (!question) {
        throw new AppError("Nie podano pytania", 400, {
          code: ChatErrorCode.EMPTY_MESSAGE,
        });
      }

      const stats = await this.chatStatsService.getQuestionStats(question);
      res.json(stats);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(
          new AppError("Błąd pobierania statystyk", 500, {
            code: ChatErrorCode.STATS_ERROR,
            details: error.message,
          })
        );
      }
    }
  }

  async clearStats(req, res, next) {
    try {
      const result = await this.chatStatsService.clearStats();
      res.json(result);
    } catch (error) {
      next(
        new AppError("Błąd czyszczenia statystyk", 500, {
          code: ChatErrorCode.STATS_ERROR,
          details: error.message,
        })
      );
    }
  }

  async updateConfig(req, res, next) {
    try {
      const { temperature, max_tokens } = req.body;

      if (temperature !== undefined) {
        if (temperature < 0 || temperature > 2) {
          throw new AppError(
            "Temperatura musi być wartością między 0 a 2",
            400,
            {
              code: ChatErrorCode.INVALID_TEMPERATURE,
              details: { temperature, min: 0, max: 2 },
            }
          );
        }
      }

      const result = await this.chatService.updateConfig({
        temperature,
        max_tokens,
      });
      res.json({
        message: "Zaktualizowano konfigurację",
        config: result,
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(
          new AppError("Błąd aktualizacji konfiguracji", 500, {
            code: ChatErrorCode.SERVICE_UNAVAILABLE,
            details: error.message,
          })
        );
      }
    }
  }

  async getConfig(req, res, next) {
    try {
      const config = this.chatService.getConfig();
      res.json(config);
    } catch (error) {
      next(
        new AppError("Błąd pobierania konfiguracji", 500, {
          code: ChatErrorCode.SERVICE_UNAVAILABLE,
          details: error.message,
        })
      );
    }
  }
}
