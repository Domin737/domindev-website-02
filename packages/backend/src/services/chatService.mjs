import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import { estimateTokenCount } from "@domindev-website-02/shared/dist/index.js";
import { AppError } from "../middleware/errorHandler.mjs";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MAX_TOKENS_PER_REQUEST = 4000;
const REQUEST_TIMEOUT = 30000;
const MAX_REQUESTS_PER_MINUTE = 50;

export class ChatService {
  constructor() {
    this.config = {
      temperature: 0.5,
      max_tokens: 800,
    };

    this.stats = {
      messageCount: 0,
      requestsInLastMinute: 0,
      lastRequestTime: Date.now(),
    };

    this.initializeModel();
    this.initializePrompt();
    this.initializeRateLimiter();
  }

  initializeModel() {
    if (!process.env.OPENAI_API_KEY) {
      throw new AppError("Brak klucza API OpenAI", 500);
    }

    this.model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: this.config.temperature,
      maxTokens: this.config.max_tokens,
      modelName: "gpt-4-turbo-preview",
      streaming: false,
      timeout: REQUEST_TIMEOUT,
      maxRetries: MAX_RETRIES,
    });
  }

  initializePrompt() {
    const systemPrompt = `Asystent DominDev - WordPress, WooCommerce, SEO, marketing online.

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
    - Temp > 0.5: dozwolone żarty tech`;

    // Sprawdź długość promptu systemowego
    const systemTokenCount = estimateTokenCount(systemPrompt);
    console.log(
      `[ChatBot]: Długość promptu systemowego: ~${systemTokenCount} tokenów`
    );

    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(systemPrompt),
      HumanMessagePromptTemplate.fromTemplate("{input}"),
    ]);

    this.chain = RunnableSequence.from([chatPrompt, this.model]);
  }

  initializeRateLimiter() {
    setInterval(() => {
      const now = Date.now();
      if (now - this.stats.lastRequestTime >= 60000) {
        this.stats.requestsInLastMinute = 0;
        this.stats.lastRequestTime = now;
      }
    }, 60000);
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async retryWithExponentialBackoff(fn, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        const delay = RETRY_DELAY * Math.pow(2, i);
        console.log(
          `[ChatBot]: Próba ${i + 1} nieudana, ponowienie za ${delay}ms`
        );
        await this.sleep(delay);
      }
    }
  }

  checkRateLimit() {
    const now = Date.now();
    if (now - this.stats.lastRequestTime >= 60000) {
      this.stats.requestsInLastMinute = 1;
      this.stats.lastRequestTime = now;
    } else {
      this.stats.requestsInLastMinute++;
    }

    if (this.stats.requestsInLastMinute > MAX_REQUESTS_PER_MINUTE) {
      throw new AppError("Przekroczono limit zapytań na minutę", 429);
    }
  }

  async processMessage(message, abortSignal) {
    if (!message?.trim()) {
      throw new AppError("Wiadomość nie może być pusta", 400);
    }

    this.checkRateLimit();
    this.stats.messageCount++;

    const messageTokens = estimateTokenCount(message);
    if (messageTokens > MAX_TOKENS_PER_REQUEST) {
      throw new AppError("Wiadomość jest zbyt długa", 400);
    }

    console.log("\n[ChatBot]: === NOWE ZAPYTANIE ===");
    console.log(`[ChatBot]: Zapytanie #${this.stats.messageCount}`);
    console.log(`[ChatBot]: Treść: ${message}`);
    console.log(`[ChatBot]: Długość zapytania: ${message.length} znaków`);
    console.log(`[ChatBot]: Szacowana liczba tokenów: ~${messageTokens}`);
    console.log(`[ChatBot]: Temperatura: ${this.config.temperature}`);
    console.log("[ChatBot]: ====================\n");

    try {
      const startTime = Date.now();

      const processRequest = async () => {
        if (abortSignal?.aborted) {
          throw new AppError("Zapytanie zostało przerwane", 408);
        }

        const response = await this.chain.invoke({
          input: message,
        });

        if (abortSignal?.aborted) {
          throw new AppError("Zapytanie zostało przerwane", 408);
        }

        return response;
      };

      const response = await this.retryWithExponentialBackoff(processRequest);
      const finalResponse = response.content;

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const finalResponseLength = finalResponse.length;
      const finalTokenCount = estimateTokenCount(finalResponse);

      console.log("\n[ChatBot]: === STATYSTYKI ODPOWIEDZI ===");
      console.log(`[ChatBot]: Czas odpowiedzi: ${responseTime}ms`);
      console.log(`[ChatBot]: Długość tekstu: ${finalResponseLength} znaków`);
      console.log(`[ChatBot]: Szacowana liczba tokenów: ~${finalTokenCount}`);
      console.log(
        `[ChatBot]: Całkowita liczba tokenów: ~${
          messageTokens + finalTokenCount
        }`
      );
      console.log("[ChatBot]: ===========================\n");

      return {
        content: finalResponse,
        stats: {
          responseTime,
          length: finalResponseLength,
          estimatedTokens: finalTokenCount,
          totalTokens: messageTokens + finalTokenCount,
        },
      };
    } catch (error) {
      console.error("[ChatBot]: Błąd podczas przetwarzania wiadomości:", error);

      if (error.message.includes("timeout") || error.code === 408) {
        throw new AppError("Przekroczono czas oczekiwania na odpowiedź", 408);
      }

      if (error.message.includes("rate") || error.code === 429) {
        throw new AppError("Przekroczono limit zapytań", 429);
      }

      throw new AppError(
        "Nie udało się przetworzyć wiadomości",
        error.code || 500,
        error.message
      );
    }
  }

  updateConfig(newConfig) {
    if (
      newConfig.temperature !== undefined &&
      (newConfig.temperature < 0 || newConfig.temperature > 1)
    ) {
      throw new AppError("Temperatura musi być wartością między 0 a 1", 400);
    }

    const oldTemp = this.config.temperature;
    this.config = { ...this.config, ...newConfig };

    console.log("\n[ChatBot]: === ZMIANA TEMPERATURY ===");
    console.log(`[ChatBot]: Poprzednia temperatura: ${oldTemp}`);
    console.log(`[ChatBot]: Nowa temperatura: ${this.config.temperature}`);
    console.log("[ChatBot]: ========================\n");

    this.initializeModel();

    return {
      message: "Zaktualizowano konfigurację",
      oldConfig: { temperature: oldTemp },
      newConfig: { temperature: this.config.temperature },
    };
  }

  getConfig() {
    return {
      temperature: this.config.temperature,
      requestsInLastMinute: this.stats.requestsInLastMinute,
      messageCount: this.stats.messageCount,
    };
  }
}
