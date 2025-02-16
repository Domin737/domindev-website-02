import { AppError } from "../middleware/errorHandler.mjs";
import { ChatErrorCode } from "@domindev-website-02/shared/dist/types/chat.js";

const CONTEXT_CACHE_TTL = 5 * 60 * 1000; // 5 minut
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 godzina

export class ChatContextService {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.CONTEXT_KEY_PREFIX = "ctx:";
    this.CONTEXT_TTL = 30 * 60; // 30 minut
    this.MAX_CONTEXT_LENGTH = 20; // maksymalna liczba wiadomości w kontekście
    this.contextCache = new Map();

    // Uruchom czyszczenie cache co godzinę
    setInterval(() => this.cleanupCache(), CLEANUP_INTERVAL);
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.contextCache.entries()) {
      if (now - value.timestamp > CONTEXT_CACHE_TTL) {
        this.contextCache.delete(key);
      }
    }
  }

  getFromCache(key) {
    const cached = this.contextCache.get(key);
    if (cached && Date.now() - cached.timestamp < CONTEXT_CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  setInCache(key, data) {
    this.contextCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  async getContext(sessionId) {
    if (!sessionId) {
      throw new AppError("Brak identyfikatora sesji", 400, {
        code: ChatErrorCode.SESSION_ERROR,
      });
    }

    const contextKey = `${this.CONTEXT_KEY_PREFIX}${sessionId}`;
    console.log("[Context]: Pobieranie kontekstu dla klucza:", contextKey);

    // Sprawdź cache w pamięci
    const cachedContext = this.getFromCache(contextKey);
    if (cachedContext) {
      return cachedContext;
    }

    try {
      // Użyj pipeline do pobrania wiadomości i odświeżenia TTL
      const pipeline = this.redisClient.multi();
      pipeline.lRange(contextKey, 0, -1);
      pipeline.expire(contextKey, this.CONTEXT_TTL);
      const results = await pipeline.exec();

      console.log("[Context]: Wyniki pipeline:", results);

      // Sprawdź czy mamy wyniki
      if (!results || !Array.isArray(results)) {
        console.log("[Context]: Brak wyników z Redis");
        return [];
      }

      // Pobierz wiadomości z pierwszego wyniku
      const [lRangeResult] = results;
      console.log("[Context]: Wynik lRange:", lRangeResult);

      if (!lRangeResult || !Array.isArray(lRangeResult)) {
        console.log("[Context]: Brak wiadomości w kontekście");
        return [];
      }

      const messages = lRangeResult
        .map((message) => {
          try {
            return JSON.parse(message);
          } catch (error) {
            console.error("[Context]: Błąd parsowania wiadomości:", error);
            return null;
          }
        })
        .filter(Boolean);

      console.log("[Context]: Przetworzone wiadomości:", messages);

      // Zapisz w cache
      this.setInCache(contextKey, messages);

      return messages;
    } catch (error) {
      console.error("[Redis]: Błąd podczas pobierania kontekstu:", error);
      throw new AppError("Nie udało się pobrać kontekstu rozmowy", 500, {
        code: ChatErrorCode.CONTEXT_ERROR,
        details: error.message,
      });
    }
  }

  async addToContext(sessionId, message, role) {
    if (!sessionId) {
      throw new AppError("Brak identyfikatora sesji", 400, {
        code: ChatErrorCode.SESSION_ERROR,
      });
    }

    if (!message) {
      throw new AppError("Wiadomość nie może być pusta", 400, {
        code: ChatErrorCode.EMPTY_MESSAGE,
      });
    }

    const contextKey = `${this.CONTEXT_KEY_PREFIX}${sessionId}`;
    console.log("[Context]: Dodawanie wiadomości do klucza:", contextKey);

    const contextMessage = JSON.stringify({
      role,
      content: message,
      timestamp: Date.now(),
    });

    try {
      // Użyj pipeline do atomowej aktualizacji kontekstu
      const pipeline = this.redisClient.multi();

      // Dodaj nową wiadomość na początek listy
      pipeline.lPush(contextKey, contextMessage);

      // Przytnij kontekst do maksymalnej długości
      pipeline.lTrim(contextKey, 0, this.MAX_CONTEXT_LENGTH - 1);

      // Odśwież TTL
      pipeline.expire(contextKey, this.CONTEXT_TTL);

      const results = await pipeline.exec();
      console.log("[Context]: Wyniki pipeline:", results);

      // Sprawdź czy operacje się powiodły
      if (!results || !Array.isArray(results)) {
        throw new Error("Błąd wykonania pipeline Redis");
      }

      // Sprawdź wyniki poszczególnych operacji
      const [lPushResult, lTrimResult, expireResult] = results;
      console.log("[Context]: Wyniki operacji:", {
        lPush: lPushResult,
        lTrim: lTrimResult,
        expire: expireResult,
      });

      if (!lPushResult || !lTrimResult || !expireResult) {
        throw new Error("Jedna z operacji Redis nie powiodła się");
      }

      // Invalidate cache
      this.contextCache.delete(contextKey);

      console.log("\n[Context]: === ZAKTUALIZOWANO KONTEKST ===");
      console.log(`[Context]: Sesja: ${sessionId}`);
      console.log(`[Context]: Rola: ${role}`);

      return {
        message: "Dodano wiadomość do kontekstu",
        sessionId,
        role,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas aktualizacji kontekstu:", error);
      throw new AppError("Nie udało się zaktualizować kontekstu rozmowy", 500, {
        code: ChatErrorCode.CONTEXT_ERROR,
        details: error.message,
      });
    }
  }

  async clearContext(sessionId) {
    if (!sessionId) {
      throw new AppError("Brak identyfikatora sesji", 400, {
        code: ChatErrorCode.SESSION_ERROR,
      });
    }

    const contextKey = `${this.CONTEXT_KEY_PREFIX}${sessionId}`;
    console.log("[Context]: Czyszczenie kontekstu dla klucza:", contextKey);

    try {
      const result = await this.redisClient.del(contextKey);
      console.log("[Context]: Wynik czyszczenia:", result);

      // Invalidate cache
      this.contextCache.delete(contextKey);

      console.log("\n[Context]: === WYCZYSZCZONO KONTEKST ===");
      console.log(`[Context]: Sesja: ${sessionId}`);

      return {
        message: "Wyczyszczono kontekst rozmowy",
        sessionId,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas czyszczenia kontekstu:", error);
      throw new AppError("Nie udało się wyczyścić kontekstu rozmowy", 500, {
        code: ChatErrorCode.CONTEXT_ERROR,
        details: error.message,
      });
    }
  }

  async getContextStats() {
    try {
      // Pobierz wszystkie klucze kontekstów
      const keys = await this.redisClient.keys(`${this.CONTEXT_KEY_PREFIX}*`);
      console.log("[Context]: Znalezione klucze:", keys);

      if (!keys.length) {
        return {
          activeSessions: 0,
          sessions: [],
          cacheSize: this.contextCache.size,
        };
      }

      // Użyj pipeline do pobrania informacji o wszystkich kontekstach
      const pipeline = this.redisClient.multi();

      for (const key of keys) {
        pipeline.lLen(key);
        pipeline.ttl(key);
      }

      const results = await pipeline.exec();
      console.log("[Context]: Wyniki pipeline:", results);

      // Sprawdź czy mamy wyniki
      if (!results || !Array.isArray(results)) {
        throw new Error("Błąd wykonania pipeline Redis");
      }

      const stats = [];

      // Przetwórz wyniki
      for (let i = 0; i < keys.length; i++) {
        const sessionId = keys[i].replace(this.CONTEXT_KEY_PREFIX, "");
        const [lLenResult, ttlResult] = [results[i * 2], results[i * 2 + 1]];

        if (!lLenResult || !ttlResult) {
          console.warn(
            `[Context]: Brak wyników dla sesji ${sessionId}:`,
            lLenResult,
            ttlResult
          );
          continue;
        }

        stats.push({
          sessionId,
          messageCount: lLenResult,
          ttl: ttlResult,
          inCache: this.contextCache.has(keys[i]),
        });
      }

      console.log("[Context]: Przetworzone statystyki:", stats);

      return {
        activeSessions: stats.length,
        sessions: stats,
        cacheSize: this.contextCache.size,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas pobierania statystyk:", error);
      throw new AppError("Nie udało się pobrać statystyk kontekstu", 500, {
        code: ChatErrorCode.CONTEXT_ERROR,
        details: error.message,
      });
    }
  }
}
