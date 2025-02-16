import { normalizeQuestion } from "@domindev-website-02/shared/dist/utils/validation.js";
import { AppError } from "../middleware/errorHandler.mjs";

const STATS_CACHE_TTL = 5 * 60 * 1000; // 5 minut
const STATS_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 godziny
const MIN_USE_COUNT = 2; // Minimalna liczba użyć do zachowania statystyk
const MAX_QUESTIONS = 1000; // Maksymalna liczba pytań w statystykach

export class ChatStatsService {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.QUESTION_KEY_PREFIX = "q:";
    this.STATS_SORTED_SET = "question_stats";
    this.SUPPORTED_TEMPERATURES = [0.3, 0.5, 0.7, 0.9];
    this.statsCache = new Map();
    this.faqCache = new Map();

    // Uruchom czyszczenie starych statystyk co 24h
    setInterval(() => this.cleanupOldStats(), STATS_CLEANUP_INTERVAL);
  }

  cleanupCache() {
    const now = Date.now();
    if (now - this.statsCache.timestamp > STATS_CACHE_TTL) {
      this.statsCache.clear();
      this.faqCache.clear();
    }
  }

  getFromStatsCache(key) {
    const cached = this.statsCache.get(key);
    if (cached && Date.now() - cached.timestamp < STATS_CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  setInStatsCache(key, data) {
    this.statsCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  getFromFAQCache() {
    const cached = this.faqCache.get("faq");
    if (cached && Date.now() - cached.timestamp < STATS_CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  setInFAQCache(data) {
    this.faqCache.set("faq", {
      data,
      timestamp: Date.now(),
    });
  }

  async updateQuestionStats(question, temperature) {
    if (!question || question.trim().length === 0) {
      throw new AppError("Pytanie nie może być puste", 400);
    }

    try {
      const normalizedQuestion = normalizeQuestion(question);

      // Użyj pipeline do atomowej aktualizacji
      const pipeline = this.redisClient.multi();

      // Sprawdź całkowitą liczbę pytań
      pipeline.zCard(this.STATS_SORTED_SET);
      // Zwiększ licznik pytania
      pipeline.zIncrBy(this.STATS_SORTED_SET, 1, normalizedQuestion);
      // Pobierz aktualny wynik
      pipeline.zScore(this.STATS_SORTED_SET, normalizedQuestion);

      const results = await pipeline.exec();

      if (!results || !Array.isArray(results)) {
        throw new Error("Błąd wykonania pipeline Redis");
      }

      const [totalQuestions, incrResult, scoreResult] = results;

      // Jeśli przekroczono limit pytań, usuń pytania z najniższym score
      if (totalQuestions > MAX_QUESTIONS) {
        await this.cleanupOldStats();
      }

      const score = scoreResult || 1;

      // Invalidate cache
      this.statsCache.delete(normalizedQuestion);
      this.faqCache.delete("faq");

      // Sprawdź cache odpowiedzi
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

    // Sprawdź cache
    const cachedFAQ = this.getFromFAQCache();
    if (cachedFAQ) {
      return {
        ...cachedFAQ,
        fromCache: true,
      };
    }

    try {
      // Pobierz top N pytań z najwyższym score
      const pipeline = this.redisClient.multi();
      pipeline.zRange(this.STATS_SORTED_SET, 0, -1, "REV");
      pipeline.zRange(this.STATS_SORTED_SET, 0, -1, "REV", "WITHSCORES");

      const results = await pipeline.exec();

      if (!results || !Array.isArray(results)) {
        throw new Error("Błąd wykonania pipeline Redis");
      }

      const [questions, scoresResult] = results;

      if (!questions || questions.length === 0) {
        return {
          questions: [],
          total: 0,
          limit,
        };
      }

      // Przekształć wyniki na pary [pytanie, score]
      const questionsWithScores = [];
      for (let i = 0; i < scoresResult.length; i += 2) {
        questionsWithScores.push({
          value: scoresResult[i],
          score: parseFloat(scoresResult[i + 1]),
        });
      }

      // Przygotuj pipeline do sprawdzenia cache dla każdego pytania
      const cachePipeline = this.redisClient.multi();
      for (const { value: question } of questionsWithScores) {
        for (const temp of this.SUPPORTED_TEMPERATURES) {
          const cacheKey = `${this.QUESTION_KEY_PREFIX}${question}_temp_${temp}`;
          cachePipeline.lRange(cacheKey, 0, -1);
        }
      }

      const cacheResults = await cachePipeline.exec();

      if (!cacheResults || !Array.isArray(cacheResults)) {
        throw new Error("Błąd wykonania pipeline Redis");
      }

      const appropriateQuestions = [];
      let resultIndex = 0;

      for (const { value: question, score } of questionsWithScores) {
        for (const temp of this.SUPPORTED_TEMPERATURES) {
          const answers = cacheResults[resultIndex++];
          if (answers && answers.length > 0) {
            const parsedAnswers = answers
              .map((answer) => {
                try {
                  return JSON.parse(answer);
                } catch (error) {
                  console.error("[Stats]: Błąd parsowania odpowiedzi:", error);
                  return null;
                }
              })
              .filter(Boolean);

            if (parsedAnswers.length > 0) {
              appropriateQuestions.push({
                question,
                answers: parsedAnswers,
                useCount: score,
                temperature: temp,
              });
              break; // Znaleziono odpowiedzi dla tej temperatury
            }
          }
        }

        if (appropriateQuestions.length >= limit) {
          break;
        }
      }

      const result = {
        questions: appropriateQuestions.slice(0, limit),
        total: appropriateQuestions.length,
        limit,
      };

      // Zapisz w cache
      this.setInFAQCache(result);

      return result;
    } catch (error) {
      console.error("[Redis]: Błąd podczas pobierania FAQ:", error);
      throw new AppError("Nie udało się pobrać FAQ", 500, error.message);
    }
  }

  async getQuestionStats(question) {
    if (!question || question.trim().length === 0) {
      throw new AppError("Pytanie nie może być puste", 400);
    }

    const normalizedQuestion = normalizeQuestion(question);

    // Sprawdź cache
    const cachedStats = this.getFromStatsCache(normalizedQuestion);
    if (cachedStats) {
      return {
        ...cachedStats,
        fromCache: true,
      };
    }

    try {
      const pipeline = this.redisClient.multi();

      // Pobierz score
      pipeline.zScore(this.STATS_SORTED_SET, normalizedQuestion);

      // Przygotuj pipeline do pobrania odpowiedzi dla wszystkich temperatur
      for (const temp of this.SUPPORTED_TEMPERATURES) {
        const cacheKey = `${this.QUESTION_KEY_PREFIX}${normalizedQuestion}_temp_${temp}`;
        pipeline.lRange(cacheKey, 0, -1);
      }

      const results = await pipeline.exec();

      if (!results || !Array.isArray(results)) {
        throw new Error("Błąd wykonania pipeline Redis");
      }

      const [scoreResult, ...answersResults] = results;
      const score = scoreResult || 0;

      if (!score) {
        return {
          message: "Brak statystyk dla tego pytania",
          question: normalizedQuestion,
          useCount: 0,
        };
      }

      // Przetwórz odpowiedzi dla każdej temperatury
      const answers = {};
      this.SUPPORTED_TEMPERATURES.forEach((temp, index) => {
        const tempAnswers = answersResults[index];
        if (tempAnswers && tempAnswers.length > 0) {
          const parsedAnswers = tempAnswers
            .map((answer) => {
              try {
                return JSON.parse(answer);
              } catch (error) {
                console.error("[Stats]: Błąd parsowania odpowiedzi:", error);
                return null;
              }
            })
            .filter(Boolean);

          if (parsedAnswers.length > 0) {
            answers[temp] = parsedAnswers;
          }
        }
      });

      const result = {
        message: "Pobrano statystyki pytania",
        question: normalizedQuestion,
        useCount: score,
        answers,
      };

      // Zapisz w cache
      this.setInStatsCache(normalizedQuestion, result);

      return result;
    } catch (error) {
      console.error("[Redis]: Błąd podczas pobierania statystyk:", error);
      throw new AppError(
        "Nie udało się pobrać statystyk pytania",
        500,
        error.message
      );
    }
  }

  async cleanupOldStats() {
    try {
      // Pobierz wszystkie pytania z niskim score
      const pipeline = this.redisClient.multi();
      pipeline.zRange(this.STATS_SORTED_SET, 0, -1, "WITHSCORES");
      const results = await pipeline.exec();

      if (!results || !Array.isArray(results)) {
        throw new Error("Błąd wykonania pipeline Redis");
      }

      const [scoresResult] = results;
      const questionsToRemove = [];

      // Przeanalizuj wyniki
      for (let i = 0; i < scoresResult.length; i += 2) {
        const question = scoresResult[i];
        const score = parseFloat(scoresResult[i + 1]);
        if (score < MIN_USE_COUNT) {
          questionsToRemove.push(question);
        }
      }

      if (questionsToRemove.length === 0) {
        return;
      }

      const cleanupPipeline = this.redisClient.multi();

      // Usuń pytania z niskim score
      for (const question of questionsToRemove) {
        cleanupPipeline.zRem(this.STATS_SORTED_SET, question);

        // Usuń powiązane cache dla wszystkich temperatur
        for (const temp of this.SUPPORTED_TEMPERATURES) {
          const cacheKey = `${this.QUESTION_KEY_PREFIX}${question}_temp_${temp}`;
          cleanupPipeline.del(cacheKey);
        }

        // Invalidate cache
        this.statsCache.delete(question);
      }

      await cleanupPipeline.exec();
      this.faqCache.delete("faq");

      console.log(
        `[Stats]: Wyczyszczono ${questionsToRemove.length} nieaktywnych pytań`
      );
    } catch (error) {
      console.error(
        "[Redis]: Błąd podczas czyszczenia starych statystyk:",
        error
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

      // Wyczyść wszystkie statystyki i cache
      const pipeline = this.redisClient.multi();
      pipeline.del(this.STATS_SORTED_SET);

      // Pobierz i wyczyść wszystkie klucze cache
      const cacheKeys = await this.redisClient.keys(
        `${this.QUESTION_KEY_PREFIX}*`
      );
      if (cacheKeys.length > 0) {
        pipeline.del(cacheKeys);
      }

      await pipeline.exec();

      // Wyczyść cache w pamięci
      this.statsCache.clear();
      this.faqCache.clear();

      return {
        message: "Wyczyszczono statystyki",
        clearedStats: count,
        clearedCache: cacheKeys.length,
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
