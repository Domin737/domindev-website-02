import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import { estimateTokenCount } from "@domindev-website-02/shared/dist/index.js";
import { AppError } from "../middleware/errorHandler.mjs";

export class ChatService {
  constructor() {
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
    if (!process.env.OPENAI_API_KEY) {
      throw new AppError("Brak klucza API OpenAI", 500);
    }

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

  async processMessage(message) {
    if (!message || message.trim().length === 0) {
      throw new AppError("Wiadomość nie może być pusta", 400);
    }

    this.stats.messageCount++;

    console.log("\n[ChatBot]: === NOWE ZAPYTANIE ===");
    console.log(`[ChatBot]: Zapytanie #${this.stats.messageCount}`);
    console.log(`[ChatBot]: Treść: ${message}`);
    console.log(`[ChatBot]: Długość zapytania: ${message.length} znaków`);
    console.log(
      `[ChatBot]: Szacowana liczba tokenów: ~${estimateTokenCount(message)}`
    );
    console.log("[ChatBot]: ====================\n");

    try {
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

      return {
        content: finalResponse,
        stats: {
          responseTime,
          length: finalResponseLength,
          estimatedTokens: finalTokenCount,
        },
      };
    } catch (error) {
      console.error("[ChatBot]: Błąd podczas przetwarzania wiadomości:", error);
      throw new AppError(
        "Nie udało się przetworzyć wiadomości",
        500,
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
    };
  }
}
