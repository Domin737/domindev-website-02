import { normalizeQuestion } from "@domindev-website-02/shared/dist/index.js";
import { AppError } from "../middleware/errorHandler.mjs";

export class ModerationService {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.BANNED_WORDS_KEY = "banned_words";
  }

  async getBannedWords() {
    try {
      const words = await this.redisClient.sMembers(this.BANNED_WORDS_KEY);
      return words.sort(); // Sortujemy dla lepszej czytelności
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

  async addBannedWord(word) {
    if (!word || word.trim().length === 0) {
      throw new AppError("Słowo nie może być puste", 400);
    }

    try {
      const normalizedWord = word.toLowerCase().trim();

      // Sprawdź czy słowo już istnieje
      const exists = await this.redisClient.sIsMember(
        this.BANNED_WORDS_KEY,
        normalizedWord
      );

      if (exists) {
        throw new AppError("To słowo już znajduje się na liście", 400);
      }

      await this.redisClient.sAdd(this.BANNED_WORDS_KEY, normalizedWord);

      return {
        message: "Dodano słowo do listy zabronionych",
        word: normalizedWord,
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

  async removeBannedWord(word) {
    if (!word || word.trim().length === 0) {
      throw new AppError("Słowo nie może być puste", 400);
    }

    try {
      const normalizedWord = word.toLowerCase().trim();

      // Sprawdź czy słowo istnieje przed usunięciem
      const exists = await this.redisClient.sIsMember(
        this.BANNED_WORDS_KEY,
        normalizedWord
      );

      if (!exists) {
        throw new AppError("Podane słowo nie znajduje się na liście", 404);
      }

      await this.redisClient.sRem(this.BANNED_WORDS_KEY, normalizedWord);

      return {
        message: "Usunięto słowo z listy zabronionych",
        word: normalizedWord,
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

  async containsBannedWords(text) {
    if (!text || text.trim().length === 0) {
      throw new AppError("Tekst do sprawdzenia nie może być pusty", 400);
    }

    try {
      const bannedWords = await this.getBannedWords();
      const normalizedText = normalizeQuestion(text);
      const foundWords = bannedWords.filter((word) =>
        normalizedText.includes(word)
      );

      return {
        containsBannedWords: foundWords.length > 0,
        foundWords: foundWords,
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
}
