import "dotenv/config";
import express from "express";
import cors from "cors";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { BufferMemory } from "langchain/memory";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";

const app = express();
app.use(cors());
app.use(express.json());

let chatbotConfig = {
  temperature: 0.5,
  max_tokens: 500, // Zoptymalizowany limit tokenów dla zwięzłych odpowiedzi
};

let conversationStats = {
  messageCount: 0,
};

// Tworzenie szablonu promptu
const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `Jesteś przyjaznym asystentem DominDev - firmy specjalizującej się w tworzeniu i redesignie stron WordPress, sklepów WooCommerce, integracji wtyczek, optymalizacji SEO i marketingu online.
    
    Odpowiadasz TYLKO na pytania dotyczące:
    - Tworzenia i modyfikowania stron WordPress (w tym konfiguracja wtyczek, dostosowywanie szablonów)
    - Pisania „dedykowanego" (custom) kodu i wdrażania niestandardowych rozwiązań
    - Implementacji i optymalizacji WooCommerce
    - Analizy istniejących stron i poprawy ich funkcjonalności
    - SEO, integracji zewnętrznych systemów (CRM, ERP, płatności)
    - UX/UI, marketingu online i brandingu
    - Utrzymania stron, doradztwa w zakresie hostingu i abonamentowej opieki
    - Generowania obrazów przy pomocy AI
    - Wsparcia i współpracy z DominDev
    - Narzędzi i rekomendacji technologicznych (CMS, wtyczki, frameworki)
    - Ciekawostek i informacji o DominDev
    - Implementacji i aktualizacji konfiguracji chatbota
    - Innych pytań związanych z technologią i stronami internetowymi

    ZASADY FORMATOWANIA:
    1. Używaj Markdown do formatowania odpowiedzi:
       - **Pogrubienie** dla słów kluczowych i ważnych terminów
       - _Kursywa_ dla podkreślenia znaczenia
       - \`kod\` dla nazw technologii, funkcji, komend
       - Listy punktowane dla wyliczania opcji
       - ### dla nagłówków sekcji (jeśli potrzebne)
    
    2. Struktura odpowiedzi:
       - Zacznij od najważniejszej informacji
       - Używaj krótkich akapitów (2-3 zdania)
       - Grupuj powiązane informacje
       - Końcowe zdanie powinno być podsumowaniem lub zachętą do działania

    WAŻNE ZASADY:
    - Odpowiadaj BARDZO zwięźle i konkretnie, maksymalnie 3-4 zdania na punkt
    - Ogranicz odpowiedź do maksymalnie 5-6 najważniejszych punktów
    - Unikaj rozbudowanych wyjaśnień i przykładów
    - Skup się tylko na kluczowych informacjach
    - Jeśli pytanie jest bardzo ogólne, zasugeruj rozbicie go na bardziej szczegółowe pytania
    - Jeśli pytanie nie dotyczy wymienionych tematów, odpowiedz: "Przepraszam, ale nie mogę w tym pomóc. Jeśli masz inne pytanie, chętnie pomogę ;)"
    - Jeżeli temperatura czatu przekracza 0.5, możesz pozwolić sobie na delikatne żarty w tematyce technologii
    - Przy wyliczaniu oferty/usług, wybierz tylko te najistotniejsze dla pytającego`
  ),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);

// Tworzenie historii rozmowy
const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: "chat_history",
  outputKey: "output",
});

global.model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: chatbotConfig.temperature,
  maxTokens: chatbotConfig.max_tokens,
  modelName: "gpt-4-turbo-preview",
});

// Tworzenie sekwencji przetwarzania wiadomości
const chain = RunnableSequence.from([chatPrompt, global.model]);

// Funkcja do liczenia tokenów (przybliżona metoda)
const countTokens = (text) => {
  // Przybliżona metoda: średnio 4 znaki = 1 token dla języka angielskiego/polskiego
  return Math.ceil(text.length / 4);
};

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    conversationStats.messageCount++;
    console.log("\x1b[36m%s\x1b[0m", "\n=== NOWE ZAPYTANIE ===");
    console.log(
      "\x1b[37m%s\x1b[0m",
      `Zapytanie #${conversationStats.messageCount}`
    );
    console.log("\x1b[37m%s\x1b[0m", `Treść: ${message}`);
    console.log(
      "\x1b[37m%s\x1b[0m",
      `Długość zapytania: ${message.length} znaków`
    );
    console.log(
      "\x1b[37m%s\x1b[0m",
      `Szacowana liczba tokenów: ~${countTokens(message)}`
    );
    console.log("\x1b[36m%s\x1b[0m", "====================\n");

    const startTime = Date.now();

    const response = await chain.invoke({
      chat_history: await memory.loadMemoryVariables({}),
      input: message,
    });

    let finalResponse = response.content;
    const estimatedResponseTokens = countTokens(response.content);

    // Sprawdzanie długości odpowiedzi
    if (estimatedResponseTokens > 400) {
      // Próg ostrzeżenia
      const warningMessage =
        "\n\n_Odpowiedź jest dość długa. Możesz zadać bardziej konkretne pytanie, aby otrzymać zwięzłą odpowiedź._";
      finalResponse = response.content + warningMessage;
    }

    // Zapisanie odpowiedzi AI w pamięci
    await memory.saveContext({ input: message }, { output: finalResponse });

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const responseLength = response.content.length;
    const estimatedTokens = countTokens(response.content);

    console.log("\x1b[32m%s\x1b[0m", "\n=== STATYSTYKI ODPOWIEDZI ===");
    console.log("\x1b[37m%s\x1b[0m", `Czas odpowiedzi: ${responseTime}ms`);
    console.log(
      "\x1b[37m%s\x1b[0m",
      `Długość tekstu: ${responseLength} znaków`
    );
    console.log(
      "\x1b[37m%s\x1b[0m",
      `Szacowana liczba tokenów: ~${estimatedTokens}`
    );
    console.log("\x1b[32m%s\x1b[0m", "===========================\n");

    res.json({ reply: finalResponse });
  } catch (error) {
    console.log("\x1b[31m%s\x1b[0m", "\n=== BŁĄD PRZETWARZANIA ===");
    console.error("\x1b[31m%s\x1b[0m", error);
    console.log("\x1b[31m%s\x1b[0m", "========================\n");
    res.status(500).json({
      error: "Wystąpił błąd podczas przetwarzania wiadomości",
      details: error.message,
    });
  }
});

app.post("/update-config", (req, res) => {
  try {
    const { temperature } = req.body;
    if (typeof temperature !== "number" || temperature < 0 || temperature > 1) {
      return res.status(400).json({
        error:
          "Nieprawidłowa wartość temperatury. Wartość musi być między 0 a 1.",
      });
    }

    chatbotConfig.temperature = temperature;

    // Aktualizacja modelu
    global.model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: chatbotConfig.temperature,
      modelName: "gpt-4-turbo-preview",
    });

    res.json({
      message: "Zaktualizowano konfigurację",
      newConfig: chatbotConfig,
    });
  } catch (error) {
    console.error("Błąd podczas aktualizacji konfiguracji:", error);
    res.status(500).json({
      error: "Wystąpił błąd podczas aktualizacji konfiguracji",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serwer backend działa na porcie: ${PORT}`);
  console.log(`Temperatura modelu chatbota: ${chatbotConfig.temperature}`);
});
