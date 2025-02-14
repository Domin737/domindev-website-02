import { normalizeQuestion } from "@domindev-website-02/shared/dist/index.js";
import { AppError } from "../middleware/errorHandler.mjs";

const WORDS_CACHE_TTL = 5 * 60 * 1000; // 5 minut
const CACHE_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 godzina

export class ModerationService {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.BANNED_WORDS_KEY = "banned_words";
    this.BANNED_PATTERNS_KEY = "banned_patterns";
    this.wordsCache = {
      words: null,
      patterns: null,
      timestamp: 0,
      regexCache: null,
    };

    // Uruchom czyszczenie cache co godzinę
    setInterval(() => this.cleanupCache(), CACHE_CLEANUP_INTERVAL);
  }

  cleanupCache() {
    const now = Date.now();
    if (now - this.wordsCache.timestamp > WORDS_CACHE_TTL) {
      this.wordsCache.words = null;
      this.wordsCache.patterns = null;
      this.wordsCache.timestamp = 0;
      this.wordsCache.regexCache = null;
    }
  }

  async getBannedWords() {
    try {
      // Sprawdź cache
      if (
        this.wordsCache.words &&
        Date.now() - this.wordsCache.timestamp < WORDS_CACHE_TTL
      ) {
        return this.wordsCache.words;
      }

      const pipeline = this.redisClient.multi();
      pipeline.sMembers(this.BANNED_WORDS_KEY);
      pipeline.sMembers(this.BANNED_PATTERNS_KEY);

      const results = await pipeline.exec();

      if (!results || !Array.isArray(results)) {
        throw new Error("Błąd wykonania pipeline Redis");
      }

      const [words, patterns] = results;

      // Aktualizuj cache
      this.wordsCache.words = words.sort();
      this.wordsCache.patterns = patterns.sort();
      this.wordsCache.timestamp = Date.now();
      this.wordsCache.regexCache = null; // Reset cache regex

      return this.wordsCache.words;
    } catch (error) {
      console.error(
        "[Redis]: Błąd podczas pobierania zabronionych słów:",
        error
      );
      throw new AppError(
        "Nie udało się pobrać listy zabronionych słów",
        500,
        error.message
      );
    }
  }

  async addBannedWord(word, isPattern = false) {
    if (!word || word.trim().length === 0) {
      throw new AppError("Słowo nie może być puste", 400);
    }

    try {
      const normalizedWord = word.toLowerCase().trim();
      const key = isPattern ? this.BANNED_PATTERNS_KEY : this.BANNED_WORDS_KEY;

      // Sprawdź czy słowo już istnieje
      const exists = await this.redisClient.sIsMember(key, normalizedWord);

      if (exists) {
        throw new AppError("To słowo już znajduje się na liście", 400);
      }

      // Jeśli to wzorzec, sprawdź czy jest poprawnym wyrażeniem regularnym
      if (isPattern) {
        try {
          new RegExp(normalizedWord);
        } catch (e) {
          throw new AppError(
            "Nieprawidłowy wzorzec wyrażenia regularnego",
            400
          );
        }
      }

      await this.redisClient.sAdd(key, normalizedWord);

      // Invalidate cache
      this.wordsCache.words = null;
      this.wordsCache.patterns = null;
      this.wordsCache.timestamp = 0;
      this.wordsCache.regexCache = null;

      return {
        message: `Dodano ${
          isPattern ? "wzorzec" : "słowo"
        } do listy zabronionych`,
        word: normalizedWord,
        type: isPattern ? "pattern" : "word",
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error("[Redis]: Błąd podczas dodawania słowa:", error);
      throw new AppError(
        "Nie udało się dodać słowa do listy",
        500,
        error.message
      );
    }
  }

  async removeBannedWord(word, isPattern = false) {
    if (!word || word.trim().length === 0) {
      throw new AppError("Słowo nie może być puste", 400);
    }

    try {
      const normalizedWord = word.toLowerCase().trim();
      const key = isPattern ? this.BANNED_PATTERNS_KEY : this.BANNED_WORDS_KEY;

      // Sprawdź czy słowo istnieje przed usunięciem
      const exists = await this.redisClient.sIsMember(key, normalizedWord);

      if (!exists) {
        throw new AppError("Podane słowo nie znajduje się na liście", 404);
      }

      await this.redisClient.sRem(key, normalizedWord);

      // Invalidate cache
      this.wordsCache.words = null;
      this.wordsCache.patterns = null;
      this.wordsCache.timestamp = 0;
      this.wordsCache.regexCache = null;

      return {
        message: `Usunięto ${
          isPattern ? "wzorzec" : "słowo"
        } z listy zabronionych`,
        word: normalizedWord,
        type: isPattern ? "pattern" : "word",
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error("[Redis]: Błąd podczas usuwania słowa:", error);
      throw new AppError(
        "Nie udało się usunąć słowa z listy",
        500,
        error.message
      );
    }
  }

  buildRegexPattern() {
    if (this.wordsCache.regexCache) {
      return this.wordsCache.regexCache;
    }

    const words = this.wordsCache.words || [];
    const patterns = this.wordsCache.patterns || [];

    // Escape special characters in words
    const escapedWords = words.map((word) =>
      word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );

    // Combine words and patterns
    const allPatterns = [...escapedWords, ...patterns];

    if (allPatterns.length === 0) {
      return null;
    }

    try {
      // Create a single regex pattern that matches any word or pattern
      const regex = new RegExp(allPatterns.join("|"), "i");
      this.wordsCache.regexCache = regex;
      return regex;
    } catch (error) {
      console.error("[Moderation]: Błąd podczas tworzenia regex:", error);
      return null;
    }
  }

  async containsBannedWords(text) {
    if (!text || text.trim().length === 0) {
      throw new AppError("Tekst do sprawdzenia nie może być pusty", 400);
    }

    try {
      // Pobierz słowa jeśli cache jest nieważny
      if (
        !this.wordsCache.words ||
        Date.now() - this.wordsCache.timestamp >= WORDS_CACHE_TTL
      ) {
        await this.getBannedWords();
      }

      const normalizedText = normalizeQuestion(text);
      const regex = this.buildRegexPattern();

      if (!regex) {
        return {
          containsBannedWords: false,
          foundWords: [],
        };
      }

      // Znajdź wszystkie wystąpienia
      const matches = normalizedText.match(regex) || [];
      const uniqueMatches = [...new Set(matches)];

      return {
        containsBannedWords: uniqueMatches.length > 0,
        foundWords: uniqueMatches,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error("[Moderation]: Błąd podczas sprawdzania tekstu:", error);
      throw new AppError("Nie udało się sprawdzić tekstu", 500, error.message);
    }
  }

  async isContentAppropriate(text) {
    const result = await this.containsBannedWords(text);
    return !result.containsBannedWords;
  }

  async getBannedPatterns() {
    try {
      // Sprawdź cache
      if (
        this.wordsCache.patterns &&
        Date.now() - this.wordsCache.timestamp < WORDS_CACHE_TTL
      ) {
        return this.wordsCache.patterns;
      }

      const patterns = await this.redisClient.sMembers(
        this.BANNED_PATTERNS_KEY
      );
      return patterns.sort();
    } catch (error) {
      console.error(
        "[Redis]: Błąd podczas pobierania zabronionych wzorców:",
        error
      );
      throw new AppError(
        "Nie udało się pobrać listy zabronionych wzorców",
        500,
        error.message
      );
    }
  }

  async getAllBannedItems() {
    try {
      // Pobierz słowa i wzorce jeśli cache jest nieważny
      if (
        !this.wordsCache.words ||
        Date.now() - this.wordsCache.timestamp >= WORDS_CACHE_TTL
      ) {
        await this.getBannedWords();
      }

      return {
        words: this.wordsCache.words || [],
        patterns: this.wordsCache.patterns || [],
      };
    } catch (error) {
      console.error(
        "[Redis]: Błąd podczas pobierania zabronionych elementów:",
        error
      );
      throw new AppError(
        "Nie udało się pobrać listy zabronionych elementów",
        500,
        error.message
      );
    }
  }
}
