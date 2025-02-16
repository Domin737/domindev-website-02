import { AppError } from "../middleware/errorHandler.mjs";
import { normalizeQuestion } from "@domindev-website-02/shared/dist/utils/validation.js";

const CACHE_TTL = 24 * 60 * 60; // 24 godziny
const MAX_ANSWERS = 4; // Maksymalna liczba odpowiedzi w cache dla jednego pytania

export class ChatCacheService {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.QUESTION_KEY_PREFIX = "q:";
  }

  async checkCache(question, temperature) {
    if (!question || question.trim().length === 0) {
      throw new AppError("Pytanie nie może być puste", 400);
    }

    try {
      const normalizedQuestion = normalizeQuestion(question);
      const cacheKey = `${this.QUESTION_KEY_PREFIX}${normalizedQuestion}_temp_${temperature}`;

      // Pobierz odpowiedzi z cache
      const answers = await this.redisClient.lRange(cacheKey, 0, -1);
      if (!answers || answers.length === 0) {
        return null;
      }

      // Odśwież TTL
      await this.redisClient.expire(cacheKey, CACHE_TTL);

      // Wybierz losową odpowiedź z cache
      const randomIndex = Math.floor(Math.random() * answers.length);
      const answer = JSON.parse(answers[randomIndex]);

      return answer;
    } catch (error) {
      console.error("[Redis]: Błąd podczas sprawdzania cache:", error);
      throw new AppError("Nie udało się sprawdzić cache", 500, error.message);
    }
  }

  async saveToCache(question, answer, temperature) {
    if (!question || question.trim().length === 0) {
      throw new AppError("Pytanie nie może być puste", 400);
    }

    if (!answer || answer.trim().length === 0) {
      throw new AppError("Odpowiedź nie może być pusta", 400);
    }

    try {
      const normalizedQuestion = normalizeQuestion(question);
      const cacheKey = `${this.QUESTION_KEY_PREFIX}${normalizedQuestion}_temp_${temperature}`;

      // Użyj pipeline do atomowej operacji
      const pipeline = this.redisClient.multi();

      // Dodaj nową odpowiedź na początek listy
      pipeline.lPush(
        cacheKey,
        JSON.stringify({
          content: answer,
          timestamp: Date.now(),
        })
      );

      // Przytnij listę do maksymalnej długości
      pipeline.lTrim(cacheKey, 0, MAX_ANSWERS - 1);

      // Ustaw TTL
      pipeline.expire(cacheKey, CACHE_TTL);

      const results = await pipeline.exec();

      if (!results || !Array.isArray(results)) {
        throw new Error("Błąd wykonania pipeline Redis");
      }

      const [pushResult, trimResult, expireResult] = results;

      if (!pushResult || !trimResult || !expireResult) {
        throw new Error("Jedna z operacji Redis nie powiodła się");
      }

      return {
        message: "Zapisano odpowiedź w cache",
        cacheKey,
        answersCount: pushResult,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas zapisywania do cache:", error);
      throw new AppError("Nie udało się zapisać do cache", 500, error.message);
    }
  }

  async clearCache() {
    try {
      // Pobierz wszystkie klucze cache
      const keys = await this.redisClient.keys(`${this.QUESTION_KEY_PREFIX}*`);

      if (keys.length === 0) {
        return {
          message: "Brak wpisów w cache do wyczyszczenia",
          clearedKeys: 0,
        };
      }

      // Usuń wszystkie klucze
      await this.redisClient.del(keys);

      return {
        message: "Wyczyszczono cache",
        clearedKeys: keys.length,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas czyszczenia cache:", error);
      throw new AppError("Nie udało się wyczyścić cache", 500, error.message);
    }
  }

  async getCacheStats() {
    try {
      // Pobierz wszystkie klucze cache
      const keys = await this.redisClient.keys(`${this.QUESTION_KEY_PREFIX}*`);

      if (keys.length === 0) {
        return {
          totalKeys: 0,
          temperatures: {},
          expiredKeys: 0,
        };
      }

      // Przygotuj pipeline do pobrania TTL dla każdego klucza
      const pipeline = this.redisClient.multi();
      for (const key of keys) {
        pipeline.ttl(key);
      }

      const results = await pipeline.exec();

      if (!results || !Array.isArray(results)) {
        throw new Error("Błąd wykonania pipeline Redis");
      }

      // Zlicz klucze według temperatury i wygasłe
      const temperatures = {};
      let expiredKeys = 0;

      keys.forEach((key, index) => {
        const ttl = results[index];
        if (ttl <= 0) {
          expiredKeys++;
        }

        const tempMatch = key.match(/_temp_([\d.]+)$/);
        if (tempMatch) {
          const temp = tempMatch[1];
          temperatures[temp] = (temperatures[temp] || 0) + 1;
        }
      });

      return {
        totalKeys: keys.length,
        temperatures,
        expiredKeys,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas pobierania statystyk cache:", error);
      throw new AppError(
        "Nie udało się pobrać statystyk cache",
        500,
        error.message
      );
    }
  }
}
