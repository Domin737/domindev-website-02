import { normalizeQuestion } from "@domindev-website-02/shared/dist/index.js";
import { AppError } from "../middleware/errorHandler.mjs";

export class ChatCacheService {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.QUESTION_KEY_PREFIX = "q:";
    this.MAX_CACHED_RESPONSES = 4;
  }

  async checkCache(question, temperature) {
    if (!question || question.trim().length === 0) {
      throw new AppError("Pytanie nie może być puste", 400);
    }

    const normalizedQuestion = normalizeQuestion(question);
    const cacheKey = `${this.QUESTION_KEY_PREFIX}${normalizedQuestion}_temp_${temperature}`;

    try {
      const cacheType = await this.redisClient.type(cacheKey);
      if (cacheType !== "list") {
        await this.redisClient.del(cacheKey);
        return null;
      }

      const responses = await this.redisClient.lRange(cacheKey, 0, -1);

      if (!responses || responses.length < this.MAX_CACHED_RESPONSES) {
        console.log("\n[Cache]: === GENEROWANIE NOWEJ ODPOWIEDZI ===");
        console.log(
          `[Cache]: Aktualnie w cache: ${responses ? responses.length : 0}/${
            this.MAX_CACHED_RESPONSES
          }`
        );
        return null;
      }

      const response = responses[0];
      await this.redisClient.lPop(cacheKey);
      await this.redisClient.rPush(cacheKey, response);

      console.log("\n[Cache]: === ODPOWIEDŹ Z CACHE (ROTACYJNEGO) ===");
      console.log(
        `[Cache]: Rotacja odpowiedzi ${responses.length}/${this.MAX_CACHED_RESPONSES}`
      );

      return {
        content: JSON.parse(response),
        source: "cache",
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas sprawdzania cache:", error);
      throw new AppError("Nie udało się sprawdzić cache", 500, error.message);
    }
  }

  async saveToCache(question, answer, temperature) {
    if (!question || question.trim().length === 0) {
      throw new AppError("Pytanie nie może być puste", 400);
    }

    if (!answer) {
      throw new AppError("Odpowiedź nie może być pusta", 400);
    }

    const normalizedQuestion = normalizeQuestion(question);
    const cacheKey = `${this.QUESTION_KEY_PREFIX}${normalizedQuestion}_temp_${temperature}`;

    try {
      const cacheType = await this.redisClient.type(cacheKey);
      if (cacheType !== "list") {
        await this.redisClient.del(cacheKey);
      }

      const currentResponses = await this.redisClient.lLen(cacheKey);

      if (!currentResponses || currentResponses < this.MAX_CACHED_RESPONSES) {
        const existingResponses = await this.redisClient.lRange(
          cacheKey,
          0,
          -1
        );
        const isDuplicate = existingResponses.some(
          (resp) => JSON.parse(resp) === answer
        );

        if (!isDuplicate) {
          await this.redisClient.rPush(cacheKey, JSON.stringify(answer));
          await this.redisClient.expire(cacheKey, 30 * 24 * 60 * 60); // 30 dni

          console.log("\n[Cache]: === ZAPISANO NOWĄ ODPOWIEDŹ ===");
          console.log(
            `[Cache]: Aktualna liczba odpowiedzi: ${
              (currentResponses || 0) + 1
            }/${this.MAX_CACHED_RESPONSES}`
          );

          return {
            message: "Odpowiedź zapisana w cache",
            currentCount: (currentResponses || 0) + 1,
            maxCount: this.MAX_CACHED_RESPONSES,
          };
        } else {
          console.log("\n[Cache]: === POMINIĘTO DUPLIKAT ODPOWIEDZI ===");
          return {
            message: "Pominięto duplikat odpowiedzi",
            currentCount: currentResponses,
            maxCount: this.MAX_CACHED_RESPONSES,
          };
        }
      } else {
        console.log("\n[Cache]: === CACHE PEŁNY ===");
        console.log(
          `[Cache]: Osiągnięto limit ${this.MAX_CACHED_RESPONSES} odpowiedzi`
        );
        return {
          message: "Cache jest pełny",
          currentCount: this.MAX_CACHED_RESPONSES,
          maxCount: this.MAX_CACHED_RESPONSES,
        };
      }
    } catch (error) {
      console.error("[Redis]: Błąd podczas zapisywania do cache:", error);
      throw new AppError(
        "Nie udało się zapisać odpowiedzi w cache",
        500,
        error.message
      );
    }
  }

  async clearCache(question, temperature) {
    if (!question || question.trim().length === 0) {
      throw new AppError("Pytanie nie może być puste", 400);
    }

    const normalizedQuestion = normalizeQuestion(question);
    const cacheKey = `${this.QUESTION_KEY_PREFIX}${normalizedQuestion}_temp_${temperature}`;

    try {
      const exists = await this.redisClient.exists(cacheKey);
      if (!exists) {
        return {
          message: "Cache nie istnieje dla tego pytania",
          clearedResponses: 0,
        };
      }

      const responses = await this.redisClient.lLen(cacheKey);
      await this.redisClient.del(cacheKey);

      return {
        message: "Cache został wyczyszczony",
        clearedResponses: responses,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas czyszczenia cache:", error);
      throw new AppError("Nie udało się wyczyścić cache", 500, error.message);
    }
  }
}
