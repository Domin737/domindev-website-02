import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import {
  normalizeQuestion,
  estimateTokenCount,
} from "@domindev-website-02/shared/dist/index.js";

export class ChatController {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.QUESTION_KEY_PREFIX = "q:";
    this.STATS_KEY_PREFIX = "stats:";
    this.STATS_SORTED_SET = "question_stats";
    this.MAX_CACHED_RESPONSES = 4;

    this.config = {
      temperature: 0.5,
      max_tokens: 800,
    };

    this.stats = {
      messageCount: 0,
    };

    this.initializeModel();
    this.initializePrompt();
  }

  initializeModel() {
    this.model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: this.config.temperature,
      maxTokens: this.config.max_tokens,
      modelName: "gpt-4-turbo-preview",
      streaming: false,
    });
  }

  initializePrompt() {
    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(
        `Asystent DominDev - WordPress, WooCommerce, SEO, marketing online.

        Zakres: WordPress, custom kod, WooCommerce, SEO, CRM/ERP, UX/UI, hosting, AI, technologie webowe.

        Formatowanie odpowiedzi:
        1. Używaj **pogrubienia** dla kluczowych terminów i ważnych pojęć
        2. Używaj _kursywy_ dla podkreślenia ważnych informacji
        3. Używaj \`kod\` dla fragmentów kodu, nazw funkcji, komend
        4. Używaj ### dla nagłówków sekcji
        5. Używaj list numerowanych (1. 2. 3.) lub punktowanych (- dla każdego punktu)

        Zasady odpowiedzi:
        - Zawsze używaj formatowania dla lepszej czytelności
        - Maksymalnie 5 punktów w odpowiedzi
        - Każdy punkt 3-4 zdania
        - Zawsze wyróżniaj **kluczowe terminy**
        - Zawsze używaj _kursywy_ dla ważnych informacji
        - Przy ogólnych pytaniach sugeruj uszczegółowienie
        - Poza zakresem: "Przepraszam, nie mogę pomóc. Zapytaj o coś innego ;)"
        - Temp > 0.5: dozwolone żarty tech`
      ),
      HumanMessagePromptTemplate.fromTemplate("{input}"),
    ]);

    this.chain = RunnableSequence.from([chatPrompt, this.model]);
  }

  async checkCache(question) {
    const normalizedQuestion = normalizeQuestion(question);
    const cacheKey = `${this.QUESTION_KEY_PREFIX}${normalizedQuestion}_temp_${this.config.temperature}`;

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

      try {
        const type = await this.redisClient.type(this.STATS_SORTED_SET);
        if (type !== "zset") {
          await this.redisClient.del(this.STATS_SORTED_SET);
        }
        await this.redisClient.zIncrBy(
          this.STATS_SORTED_SET,
          1,
          normalizedQuestion
        );
      } catch (err) {
        console.error("[Redis]: Błąd aktualizacji statystyk:", err);
      }

      console.log("\n[Cache]: === ODPOWIEDŹ Z CACHE (ROTACYJNEGO) ===");
      console.log(
        `[Cache]: Rotacja odpowiedzi ${responses.length}/${this.MAX_CACHED_RESPONSES}`
      );

      return JSON.parse(response);
    } catch (error) {
      console.error("[Redis]: Błąd podczas sprawdzania cache:", error);
      return null;
    }
  }

  async saveToCache(question, answer) {
    const normalizedQuestion = normalizeQuestion(question);
    const cacheKey = `${this.QUESTION_KEY_PREFIX}${normalizedQuestion}_temp_${this.config.temperature}`;

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
          await this.redisClient.expire(cacheKey, 30 * 24 * 60 * 60);

          console.log("\n[Cache]: === ZAPISANO NOWĄ ODPOWIEDŹ ===");
          console.log(
            `[Cache]: Aktualna liczba odpowiedzi: ${
              (currentResponses || 0) + 1
            }/${this.MAX_CACHED_RESPONSES}`
          );
        } else {
          console.log("\n[Cache]: === POMINIĘTO DUPLIKAT ODPOWIEDZI ===");
        }
      } else {
        console.log("\n[Cache]: === CACHE PEŁNY ===");
        console.log(
          `[Cache]: Osiągnięto limit ${this.MAX_CACHED_RESPONSES} odpowiedzi`
        );
      }

      const type = await this.redisClient.type(this.STATS_SORTED_SET);
      if (type !== "zset") {
        await this.redisClient.del(this.STATS_SORTED_SET);
      }

      await this.redisClient.zIncrBy(
        this.STATS_SORTED_SET,
        1,
        normalizedQuestion
      );
    } catch (error) {
      console.error("[Redis]: Błąd podczas zapisywania do cache:", error);
    }
  }

  async processMessage(message) {
    this.stats.messageCount++;

    console.log("\n[ChatBot]: === NOWE ZAPYTANIE ===");
    console.log(`[ChatBot]: Zapytanie #${this.stats.messageCount}`);
    console.log(`[ChatBot]: Treść: ${message}`);
    console.log(`[ChatBot]: Długość zapytania: ${message.length} znaków`);
    console.log(
      `[ChatBot]: Szacowana liczba tokenów: ~${estimateTokenCount(message)}`
    );
    console.log("[ChatBot]: ====================\n");

    const startTime = Date.now();
    const response = await this.chain.invoke({
      input: message,
    });
    const finalResponse = response.content;

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const finalResponseLength = finalResponse.length;
    const finalTokenCount = estimateTokenCount(finalResponse);

    console.log("\n[ChatBot]: === STATYSTYKI ODPOWIEDZI ===");
    console.log(`[ChatBot]: Czas odpowiedzi: ${responseTime}ms`);
    console.log(`[ChatBot]: Długość tekstu: ${finalResponseLength} znaków`);
    console.log(`[ChatBot]: Szacowana liczba tokenów: ~${finalTokenCount}`);
    console.log("[ChatBot]: ===========================\n");

    await this.saveToCache(message, finalResponse);
    return finalResponse;
  }

  async getFAQ() {
    try {
      const questions = await this.redisClient.zRangeWithScores(
        this.STATS_SORTED_SET,
        0,
        9,
        {
          REV: true,
        }
      );

      const appropriateQuestions = [];
      for (const { score, value } of questions) {
        const cacheKey = `${this.QUESTION_KEY_PREFIX}${value}_temp_${this.config.temperature}`;
        const cacheType = await this.redisClient.type(cacheKey);

        if (cacheType === "list") {
          const answers = await this.redisClient.lRange(cacheKey, 0, -1);
          if (answers && answers.length > 0) {
            appropriateQuestions.push({
              question: value,
              answers: answers.map((answer) => JSON.parse(answer)),
              useCount: score,
            });
          }
        }
      }

      return appropriateQuestions;
    } catch (error) {
      console.error("[Redis]: Błąd podczas pobierania FAQ:", error);
      throw error;
    }
  }

  updateConfig(newConfig) {
    const oldTemp = this.config.temperature;
    this.config = { ...this.config, ...newConfig };

    console.log("\n[ChatBot]: === ZMIANA TEMPERATURY ===");
    console.log(`[ChatBot]: Poprzednia temperatura: ${oldTemp}`);
    console.log(`[ChatBot]: Nowa temperatura: ${this.config.temperature}`);
    console.log("[ChatBot]: ========================\n");

    this.initializeModel();
  }

  getConfig() {
    return {
      temperature: this.config.temperature,
    };
  }
}
