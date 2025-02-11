import "dotenv/config";
import express from "express";
import cors from "cors";
import { ChatOpenAI } from "@langchain/openai";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { body, validationResult } from "express-validator";
import slowDown from "express-slow-down";
import { RunnableSequence } from "@langchain/core/runnables";
import { BufferMemory } from "langchain/memory";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";

const app = express();

// Podstawowe zabezpieczenia HTTP
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb" })); // Limit wielkości żądań

// Rate limiting dla wszystkich endpointów
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 50, // zmniejszony limit do 50 żądań na okno czasowe
  message: "Przekroczono limit zapytań. Spróbuj ponownie później.",
  standardHeaders: true, // Dodaj nagłówki Rate-Limit do odpowiedzi
  legacyHeaders: false, // Wyłącz przestarzałe nagłówki X-RateLimit
});

// Bardziej restrykcyjny limit dla endpointu konfiguracyjnego
const configLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 godzina
  max: 10, // limit 10 żądań na godzinę
  message: "Przekroczono limit prób aktualizacji konfiguracji.",
});

// Spowalniacz dla częstych żądań
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minut
  delayAfter: 30, // zacznij spowalniać po 30 żądaniach
  delayMs: (hits) => hits * 200, // zwiększaj opóźnienie o 200ms dla każdego żądania
  maxDelayMs: 2000, // maksymalne opóźnienie 2 sekundy
});

// Zastosuj limitery do wszystkich endpointów
app.use(limiter);
app.use(speedLimiter);

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

// Walidacja danych dla endpointu chat
const validateChatInput = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Wiadomość nie może być pusta")
    .isLength({ max: 1000 })
    .withMessage("Wiadomość jest zbyt długa")
    .escape(),
];

// Endpoint do pobierania aktualnej konfiguracji
app.get("/config", (req, res) => {
  res.json({
    temperature: chatbotConfig.temperature,
  });
});

app.post("/chat", validateChatInput, async (req, res) => {
  // Sprawdź błędy walidacji
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
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

    // Sprawdzenie czy pytanie jest bardzo ogólne (na podstawie długości odpowiedzi)
    const initialResponse = await chain.invoke({
      chat_history: await memory.loadMemoryVariables({}),
      input: message,
    });

    const initialTokenCount = countTokens(initialResponse.content);
    let finalResponse;

    if (initialTokenCount > 400) {
      // Jeśli odpowiedź jest zbyt długa, generujemy nową, bardziej ukierunkowaną odpowiedź
      const refinedPrompt = `${message}\n\nTwoje pytanie wymaga szerszego wyjaśnienia. Zamiast długiej odpowiedzi, wskażę najważniejsze aspekty i zasugeruję, o co możesz dopytać szczegółowo:`;

      const refinedResponse = await chain.invoke({
        chat_history: await memory.loadMemoryVariables({}),
        input: refinedPrompt,
      });

      finalResponse =
        refinedResponse.content +
        "\n\n_Wybierz interesujący Cię aspekt i zapytaj o więcej szczegółów._";
    } else {
      finalResponse = initialResponse.content;
    }

    // Zapisanie odpowiedzi AI w pamięci
    await memory.saveContext({ input: message }, { output: finalResponse });

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const finalResponseLength = finalResponse.length;
    const finalTokenCount = countTokens(finalResponse);

    console.log("\x1b[32m%s\x1b[0m", "\n=== STATYSTYKI ODPOWIEDZI ===");
    console.log("\x1b[37m%s\x1b[0m", `Czas odpowiedzi: ${responseTime}ms`);
    console.log(
      "\x1b[37m%s\x1b[0m",
      `Długość tekstu: ${finalResponseLength} znaków`
    );
    console.log(
      "\x1b[37m%s\x1b[0m",
      `Szacowana liczba tokenów: ~${finalTokenCount}`
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

app.post(
  "/update-config",
  configLimiter,
  [
    body("temperature")
      .isFloat({ min: 0, max: 1 })
      .withMessage("Temperatura musi być wartością między 0 a 1"),
  ],
  (req, res) => {
    // Sprawdź błędy walidacji
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { temperature } = req.body;
      if (
        typeof temperature !== "number" ||
        temperature < 0 ||
        temperature > 1
      ) {
        return res.status(400).json({
          error:
            "Nieprawidłowa wartość temperatury. Wartość musi być między 0 a 1.",
        });
      }

      const oldTemp = chatbotConfig.temperature;
      chatbotConfig.temperature = temperature;

      console.log("\x1b[33m%s\x1b[0m", "\n=== ZMIANA TEMPERATURY ===");
      console.log("\x1b[37m%s\x1b[0m", `Poprzednia temperatura: ${oldTemp}`);
      console.log("\x1b[37m%s\x1b[0m", `Nowa temperatura: ${temperature}`);
      console.log("\x1b[33m%s\x1b[0m", "========================\n");

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
  }
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serwer backend działa na porcie: ${PORT}`);
  console.log(`Temperatura modelu chatbota: ${chatbotConfig.temperature}`);
});
