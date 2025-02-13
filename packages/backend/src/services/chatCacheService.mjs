import { normalizeQuestion } from "@domindev-website-02/shared/dist/index.js";
import { AppError } from "../middleware/errorHandler.mjs";

export class ChatCacheService {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.QUESTION_KEY_PREFIX = "q:";
    this.MAX_CACHED_RESPONSES = 4;
    this.CACHE_EXPIRY = 30 * 24 * 60 * 60; // 30 dni
  }

  async checkCache(question, temperature) {
    if (!question || question.trim().length === 0) {
      throw new AppError("Pytanie nie może być puste", 400);
    }

    const normalizedQuestion = normalizeQuestion(question);
    const cacheKey = `${this.QUESTION_KEY_PREFIX}${normalizedQuestion}_temp_${temperature}`;
    const indexKey = `${cacheKey}:index`;

    try {
      const cacheType = await this.redisClient.type(cacheKey);
      if (cacheType !== "list") {
        await this.redisClient.del(cacheKey);
        await this.redisClient.del(indexKey);
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

      // Pobierz i zwiększ indeks
      let currentIndex = await this.redisClient.get(indexKey);
      currentIndex = currentIndex ? parseInt(currentIndex) : 0;
      const nextIndex = (currentIndex + 1) % responses.length;

      // Użyj transakcji do aktualizacji indeksu
      const multi = this.redisClient.multi();
      multi.set(indexKey, nextIndex);
      multi.expire(indexKey, this.CACHE_EXPIRY);
      await multi.exec();

      const response = responses[currentIndex];

      console.log("\n[Cache]: === ODPOWIEDŹ Z CACHE (SEKWENCYJNEGO) ===");
      console.log(
        `[Cache]: Wybrano odpowiedź ${currentIndex + 1}/${responses.length}`
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
    const indexKey = `${cacheKey}:index`;

    try {
      const cacheType = await this.redisClient.type(cacheKey);
      if (cacheType !== "list") {
        await this.redisClient.del(cacheKey);
        await this.redisClient.del(indexKey);
      }

      const currentResponses = await this.redisClient.lLen(cacheKey);

      // Sprawdź duplikaty
      const existingResponses = await this.redisClient.lRange(cacheKey, 0, -1);
      const isDuplicate = existingResponses.some(
        (resp) => JSON.parse(resp) === answer
      );

      if (isDuplicate) {
        console.log("\n[Cache]: === POMINIĘTO DUPLIKAT ODPOWIEDZI ===");
        return {
          message: "Pominięto duplikat odpowiedzi",
          currentCount: currentResponses,
          maxCount: this.MAX_CACHED_RESPONSES,
        };
      }

      // Jeśli cache nie jest pełny, dodaj nową odpowiedź na koniec
      if (!currentResponses || currentResponses < this.MAX_CACHED_RESPONSES) {
        const multi = this.redisClient.multi();
        multi.rPush(cacheKey, JSON.stringify(answer));
        multi.expire(cacheKey, this.CACHE_EXPIRY);
        await multi.exec();

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
      }

      // Jeśli cache jest pełny, zastąp najstarszą odpowiedź
      const multi = this.redisClient.multi();
      multi.lPop(cacheKey); // Usuń najstarszą odpowiedź
      multi.rPush(cacheKey, JSON.stringify(answer)); // Dodaj nową na koniec
      multi.expire(cacheKey, this.CACHE_EXPIRY);
      await multi.exec();

      console.log("\n[Cache]: === ZASTĄPIONO NAJSTARSZĄ ODPOWIEDŹ ===");
      console.log(
        `[Cache]: Cache pozostaje pełny: ${this.MAX_CACHED_RESPONSES}/${this.MAX_CACHED_RESPONSES}`
      );

      return {
        message: "Zastąpiono najstarszą odpowiedź w cache",
        currentCount: this.MAX_CACHED_RESPONSES,
        maxCount: this.MAX_CACHED_RESPONSES,
      };
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
    const indexKey = `${cacheKey}:index`;

    try {
      const exists = await this.redisClient.exists(cacheKey);
      if (!exists) {
        return {
          message: "Cache nie istnieje dla tego pytania",
          clearedResponses: 0,
        };
      }

      const responses = await this.redisClient.lLen(cacheKey);

      // Usuń zarówno cache jak i indeks
      const multi = this.redisClient.multi();
      multi.del(cacheKey);
      multi.del(indexKey);
      await multi.exec();

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
