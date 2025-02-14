import { ChatErrorCode } from "@domindev-website-02/shared/dist/types/chat.js";
import { AppError } from "../middleware/errorHandler.mjs";

export class ChatController {
  constructor(
    chatService,
    chatCacheService,
    chatStatsService,
    chatContextService
  ) {
    this.chatService = chatService;
    this.chatCacheService = chatCacheService;
    this.chatStatsService = chatStatsService;
    this.chatContextService = chatContextService;
  }

  getSessionId(req) {
    console.log("[Session]: Sprawdzanie sesji:", {
      session: req.session,
      cookies: req.cookies,
      headers: req.headers,
    });

    if (!req.session) {
      throw new AppError("Brak sesji", 500, {
        code: ChatErrorCode.SESSION_ERROR,
      });
    }

    console.log("[Session]: Używam ID sesji:", req.sessionID);
    return req.sessionID;
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
      console.log("[Chat]: Otrzymano nową wiadomość");
      console.log("[Chat]: Session:", req.session);
      console.log("[Chat]: Cookies:", req.cookies);
      console.log("[Chat]: Headers:", {
        cookie: req.headers.cookie,
        origin: req.headers.origin,
        referer: req.headers.referer,
      });

      const { message } = req.body;
      await this.validateMessage(message);

      const sessionId = this.getSessionId(req);
      console.log("[Chat]: Używam sessionId:", sessionId);

      const temperature = this.chatService.getConfig().temperature;

      try {
        // Dodaj wiadomość użytkownika do kontekstu
        console.log("[Chat]: Dodaję wiadomość użytkownika do kontekstu");
        await this.chatContextService.addToContext(sessionId, message, "user");

        // Pobierz kontekst rozmowy
        console.log("[Chat]: Pobieram kontekst rozmowy");
        const context = await this.chatContextService.getContext(sessionId);
        console.log("[Chat]: Aktualny kontekst:", context);

        // Sprawdź cache
        try {
          console.log("[Chat]: Sprawdzam cache");
          const cachedResponse = await this.chatCacheService.checkCache(
            message,
            temperature
          );
          if (cachedResponse) {
            console.log("[Chat]: Znaleziono odpowiedź w cache");
            // Dodaj odpowiedź z cache do kontekstu
            await this.chatContextService.addToContext(
              sessionId,
              cachedResponse.content,
              "assistant"
            );
            await this.chatStatsService.updateQuestionStats(
              message,
              temperature
            );
            return res.json({
              reply: cachedResponse.content,
              context: await this.chatContextService.getContext(sessionId),
            });
          }
        } catch (error) {
          console.error("[Cache]: Błąd podczas sprawdzania cache:", error);
          // Kontynuuj bez cache w przypadku błędu
        }

        // Generuj nową odpowiedź z uwzględnieniem kontekstu
        console.log("[Chat]: Generuję nową odpowiedź");
        const response = await this.chatService.processMessage(
          message,
          context
        );

        // Dodaj odpowiedź do kontekstu
        console.log("[Chat]: Dodaję odpowiedź do kontekstu");
        await this.chatContextService.addToContext(
          sessionId,
          response.content,
          "assistant"
        );

        // Zapisz do cache i aktualizuj statystyki równolegle
        try {
          console.log("[Chat]: Zapisuję do cache i aktualizuję statystyki");
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

        console.log("[Chat]: Wysyłam odpowiedź");
        res.json({
          reply: response.content,
          context: await this.chatContextService.getContext(sessionId),
        });
      } catch (error) {
        console.error("[Chat]: Błąd podczas przetwarzania:", error);
        throw error;
      }
    } catch (error) {
      console.error("[Chat]: Błąd główny:", error);
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

  async getContext(req, res, next) {
    try {
      const sessionId = this.getSessionId(req);
      const context = await this.chatContextService.getContext(sessionId);
      res.json({ context });
    } catch (error) {
      next(
        new AppError("Błąd pobierania kontekstu", 500, {
          code: ChatErrorCode.CONTEXT_ERROR,
          details: error.message,
        })
      );
    }
  }

  async clearContext(req, res, next) {
    try {
      const sessionId = this.getSessionId(req);
      const result = await this.chatContextService.clearContext(sessionId);
      res.json(result);
    } catch (error) {
      next(
        new AppError("Błąd czyszczenia kontekstu", 500, {
          code: ChatErrorCode.CONTEXT_ERROR,
          details: error.message,
        })
      );
    }
  }

  async getContextStats(req, res, next) {
    try {
      const stats = await this.chatContextService.getContextStats();
      res.json(stats);
    } catch (error) {
      next(
        new AppError("Błąd pobierania statystyk kontekstu", 500, {
          code: ChatErrorCode.CONTEXT_ERROR,
          details: error.message,
        })
      );
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
        if (temperature < 0 || temperature > 1) {
          throw new AppError(
            "Temperatura musi być wartością między 0 a 1",
            400,
            {
              code: ChatErrorCode.INVALID_TEMPERATURE,
              details: { temperature, min: 0, max: 1 },
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
