import { normalizeQuestion } from "@domindev-website-02/shared/dist/utils/validation.js";
import { AppError } from "../middleware/errorHandler.mjs";

export class ChatStatsService {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.QUESTION_KEY_PREFIX = "q:";
    this.STATS_SORTED_SET = "question_stats";
    this.SUPPORTED_TEMPERATURES = [0.3, 0.5, 0.7, 0.9];
  }

  async updateQuestionStats(question, temperature) {
    if (!question || question.trim().length === 0) {
      throw new AppError("Pytanie nie może być puste", 400);
    }

    try {
      const normalizedQuestion = normalizeQuestion(question);

      // Upewnij się, że STATS_SORTED_SET istnieje i jest typu zset
      const type = await this.redisClient.type(this.STATS_SORTED_SET);
      if (type !== "zset" && type !== "none") {
        await this.redisClient.del(this.STATS_SORTED_SET);
      }

      // Zwiększ licznik pytania
      await this.redisClient.zIncrBy(
        this.STATS_SORTED_SET,
        1,
        normalizedQuestion
      );

      // Pobierz aktualny wynik
      const score = await this.redisClient.zScore(
        this.STATS_SORTED_SET,
        normalizedQuestion
      );

      // Zapisz odpowiedź w cache
      const cacheKey = `${this.QUESTION_KEY_PREFIX}${normalizedQuestion}_temp_${temperature}`;
      const cacheExists = await this.redisClient.exists(cacheKey);

      if (cacheExists) {
        const answers = await this.redisClient.lRange(cacheKey, 0, -1);
        return {
          message: "Zaktualizowano statystyki pytania",
          question: normalizedQuestion,
          useCount: score,
          answers: answers.map((answer) => JSON.parse(answer)),
        };
      }

      return {
        message: "Zaktualizowano statystyki pytania",
        question: normalizedQuestion,
        useCount: score,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas aktualizacji statystyk:", error);
      throw new AppError(
        "Nie udało się zaktualizować statystyk",
        500,
        error.message
      );
    }
  }

  async getFAQ(limit = 10) {
    if (limit < 1 || limit > 50) {
      throw new AppError("Limit musi być wartością między 1 a 50", 400);
    }

    try {
      // Pobierz wszystkie pytania i posortuj je malejąco po score
      const allQuestions = await this.redisClient.zRange(
        this.STATS_SORTED_SET,
        0,
        -1
      );

      const questionsWithScores = await Promise.all(
        allQuestions.map(async (question) => {
          const score = await this.redisClient.zScore(
            this.STATS_SORTED_SET,
            question
          );
          return { question, score: parseFloat(score) };
        })
      );

      // Sortuj malejąco po score
      questionsWithScores.sort((a, b) => b.score - a.score);

      const appropriateQuestions = [];
      for (const { question, score } of questionsWithScores) {
        // Sprawdź cache dla wszystkich obsługiwanych temperatur
        for (const temp of this.SUPPORTED_TEMPERATURES) {
          const cacheKey = `${this.QUESTION_KEY_PREFIX}${question}_temp_${temp}`;
          const cacheType = await this.redisClient.type(cacheKey);

          if (cacheType === "list") {
            const answers = await this.redisClient.lRange(cacheKey, 0, -1);
            if (answers && answers.length > 0) {
              appropriateQuestions.push({
                question,
                answers: answers.map((answer) => JSON.parse(answer)),
                useCount: score,
                temperature: temp,
              });
              break; // Znaleziono odpowiedzi dla tej temperatury, przechodzimy do następnego pytania
            }
          }
        }

        // Jeśli znaleźliśmy wystarczającą liczbę pytań, przerywamy
        if (appropriateQuestions.length >= limit) {
          break;
        }
      }

      return {
        questions: appropriateQuestions.slice(0, limit),
        total: appropriateQuestions.length,
        limit,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas pobierania FAQ:", error);
      throw new AppError("Nie udało się pobrać FAQ", 500, error.message);
    }
  }

  async getQuestionStats(question) {
    if (!question || question.trim().length === 0) {
      throw new AppError("Pytanie nie może być puste", 400);
    }

    try {
      const normalizedQuestion = normalizeQuestion(question);
      const score = await this.redisClient.zScore(
        this.STATS_SORTED_SET,
        normalizedQuestion
      );

      if (!score) {
        return {
          message: "Brak statystyk dla tego pytania",
          question: normalizedQuestion,
          useCount: 0,
        };
      }

      // Pobierz odpowiedzi dla wszystkich temperatur
      const answers = {};
      for (const temp of this.SUPPORTED_TEMPERATURES) {
        const cacheKey = `${this.QUESTION_KEY_PREFIX}${normalizedQuestion}_temp_${temp}`;
        const cacheType = await this.redisClient.type(cacheKey);

        if (cacheType === "list") {
          const cachedAnswers = await this.redisClient.lRange(cacheKey, 0, -1);
          if (cachedAnswers && cachedAnswers.length > 0) {
            answers[temp] = cachedAnswers.map((answer) => JSON.parse(answer));
          }
        }
      }

      return {
        message: "Pobrano statystyki pytania",
        question: normalizedQuestion,
        useCount: score,
        answers,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas pobierania statystyk:", error);
      throw new AppError(
        "Nie udało się pobrać statystyk pytania",
        500,
        error.message
      );
    }
  }

  async clearStats() {
    try {
      const exists = await this.redisClient.exists(this.STATS_SORTED_SET);
      if (!exists) {
        return {
          message: "Brak statystyk do wyczyszczenia",
          clearedStats: 0,
        };
      }

      const count = await this.redisClient.zCard(this.STATS_SORTED_SET);
      await this.redisClient.del(this.STATS_SORTED_SET);

      return {
        message: "Wyczyszczono statystyki",
        clearedStats: count,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas czyszczenia statystyk:", error);
      throw new AppError(
        "Nie udało się wyczyścić statystyk",
        500,
        error.message
      );
    }
  }
}
