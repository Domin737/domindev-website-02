import { normalizeQuestion } from "@domindev-website-02/shared/dist/index.js";

export class ModerationController {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.BANNED_WORDS_KEY = "banned_words";
  }

  async getBannedWords() {
    try {
      const words = await this.redisClient.sMembers(this.BANNED_WORDS_KEY);
      return words;
    } catch (error) {
      console.error(
        "[Redis]: Błąd podczas pobierania zabronionych słów:",
        error
      );
      return [];
    }
  }

  async addBannedWord(word) {
    try {
      await this.redisClient.sAdd(this.BANNED_WORDS_KEY, word.toLowerCase());
      return { message: "Dodano słowo do listy zabronionych" };
    } catch (error) {
      console.error("[Redis]: Błąd podczas dodawania słowa:", error);
      throw error;
    }
  }

  async removeBannedWord(word) {
    try {
      await this.redisClient.sRem(this.BANNED_WORDS_KEY, word.toLowerCase());
      return { message: "Usunięto słowo z listy zabronionych" };
    } catch (error) {
      console.error("[Redis]: Błąd podczas usuwania słowa:", error);
      throw error;
    }
  }

  async containsBannedWords(text) {
    const bannedWords = await this.getBannedWords();
    const normalizedText = normalizeQuestion(text);
    return bannedWords.some((word) => normalizedText.includes(word));
  }

  async isContentAppropriate(text) {
    return !(await this.containsBannedWords(text));
  }
}
