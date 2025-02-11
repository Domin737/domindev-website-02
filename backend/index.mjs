import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "redis";
import { ChatOpenAI } from "@langchain/openai";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { body, validationResult } from "express-validator";
import slowDown from "express-slow-down";
import { RunnableSequence } from "@langchain/core/runnables";
import { AIMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";

const app = express();

// Podstawowe zabezpieczenia HTTP
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb", extended: true }));
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// Rate limiting dla wszystkich endpointów
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Przekroczono limit zapytań. Spróbuj ponownie później.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Bardziej restrykcyjny limit dla endpointu konfiguracyjnego
const configLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Przekroczono limit prób aktualizacji konfiguracji.",
});

// Limit dla operacji na zabronionych słowach
const bannedWordsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10000, // Tymczasowo zwiększony limit
  message: "Przekroczono limit operacji na zabronionych słowach.",
});

// Limit dla odczytu listy zabronionych słów
const bannedWordsGetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Przekroczono limit odczytów listy zabronionych słów.",
});

// Spowalniacz dla częstych żądań
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 30,
  delayMs: (hits) => hits * 200,
  maxDelayMs: 2000,
});

app.use(limiter);
app.use(speedLimiter);

// Inicjalizacja Redis
const redisClient = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

// Obsługa błędów Redis
redisClient.on("error", (err) =>
  console.log("[Redis]: Redis Client Error", err)
);

// Połączenie z Redis
await redisClient.connect().catch((err) => {
  console.error("[Redis]: Błąd połączenia z Redis:", err);
});

// Klucze Redis
const BANNED_WORDS_KEY = "banned_words";
const QUESTION_KEY_PREFIX = "q:";
const STATS_KEY_PREFIX = "stats:";
const STATS_SORTED_SET = "question_stats";

// Funkcja do pobierania zabronionych słów
const getBannedWords = async () => {
  try {
    const words = await redisClient.sMembers(BANNED_WORDS_KEY);
    return words;
  } catch (error) {
    console.error("[Redis]: Błąd podczas pobierania zabronionych słów:", error);
    return [];
  }
};

// Funkcja sprawdzająca czy tekst zawiera zabronione słowa
const containsBannedWords = async (text) => {
  const bannedWords = await getBannedWords();
  const normalizedText = text.toLowerCase();
  return bannedWords.some((word) => normalizedText.includes(word));
};

// Funkcja do filtrowania pytań
const isQuestionAppropriate = async (question) => {
  return !(await containsBannedWords(question));
};

// Endpoint do zarządzania listą zabronionych słów
app.post(
  "/banned-words",
  bannedWordsLimiter,
  [body("word").trim().notEmpty().withMessage("Słowo nie może być puste")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { word } = req.body;
      await redisClient.sAdd(BANNED_WORDS_KEY, word.toLowerCase());
      res.json({ message: "Dodano słowo do listy zabronionych" });
    } catch (error) {
      res.status(500).json({
        error: "Błąd podczas dodawania słowa",
        details: error.message,
      });
    }
  }
);

app.delete("/banned-words/:word", bannedWordsLimiter, async (req, res) => {
  try {
    const { word } = req.params;
    await redisClient.sRem(BANNED_WORDS_KEY, word.toLowerCase());
    res.json({ message: "Usunięto słowo z listy zabronionych" });
  } catch (error) {
    res.status(500).json({
      error: "Błąd podczas usuwania słowa",
      details: error.message,
    });
  }
});

app.get("/banned-words", bannedWordsGetLimiter, async (req, res) => {
  try {
    const words = await redisClient.sMembers(BANNED_WORDS_KEY);
    res.json(words.map((word) => ({ word })));
  } catch (error) {
    res.status(500).json({
      error: "Błąd podczas pobierania listy zabronionych słów",
      details: error.message,
    });
  }
});

// Funkcja do normalizacji pytania
const normalizeQuestion = (question) => {
  return question.toLowerCase().trim().replace(/\s+/g, " ");
};

// Funkcja do sprawdzania cache'a Redis
const checkCache = async (question) => {
  const normalizedQuestion = normalizeQuestion(question);
  const cached = await redisClient.get(
    `${QUESTION_KEY_PREFIX}${normalizedQuestion}`
  );
  if (cached) {
    // Aktualizuj statystyki asynchronicznie
    redisClient
      .zIncrBy(STATS_SORTED_SET, 1, normalizedQuestion)
      .catch((err) =>
        console.error("[Redis]: Błąd aktualizacji statystyk:", err)
      );
    return JSON.parse(cached);
  }
  return null;
};

// Funkcja do zapisywania w cache'u
const saveToCache = async (question, answer) => {
  const normalizedQuestion = normalizeQuestion(question);

  if (await isQuestionAppropriate(normalizedQuestion)) {
    // Zapisz odpowiedź w cache na 24h
    await redisClient.setEx(
      `${QUESTION_KEY_PREFIX}${normalizedQuestion}`,
      24 * 60 * 60,
      JSON.stringify(answer)
    );

    // Dodaj do statystyk (sorted set)
    await redisClient.zIncrBy(STATS_SORTED_SET, 1, normalizedQuestion);
  } else {
    console.log("\n[Cache]: === POMINIĘTO ZAPIS PYTANIA ===");
    console.log("[Cache]: Pytanie zawiera niedozwolone słowa");
    console.log("[Cache]: ==============================\n");
  }
};

let chatbotConfig = {
  temperature: 0.5,
  max_tokens: 800,
};

let conversationStats = {
  messageCount: 0,
};

// Tworzenie szablonu promptu
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

global.model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: chatbotConfig.temperature,
  maxTokens: chatbotConfig.max_tokens,
  modelName: "gpt-4-turbo-preview",
  streaming: false,
});

const chain = RunnableSequence.from([chatPrompt, global.model]);

const countTokens = (text) => {
  return Math.ceil(text.length / 4);
};

const validateChatInput = [
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Wiadomość nie może być pusta")
    .isLength({ max: 1000 })
    .withMessage("Wiadomość jest zbyt długa")
    .escape(),
];

app.get("/config", (req, res) => {
  res.json({
    temperature: chatbotConfig.temperature,
  });
});

// Endpoint do pobierania najczęściej zadawanych pytań
app.get("/faq", async (req, res) => {
  try {
    // Pobierz top 10 pytań z sorted set
    const questions = await redisClient.zRangeWithScores(
      STATS_SORTED_SET,
      0,
      9,
      {
        REV: true,
      }
    );

    // Filtruj pytania i pobierz ich odpowiedzi
    const appropriateQuestions = [];
    for (const { score, value } of questions) {
      if (await isQuestionAppropriate(value)) {
        const answer = await redisClient.get(`${QUESTION_KEY_PREFIX}${value}`);
        if (answer) {
          appropriateQuestions.push({
            question: value,
            answer: JSON.parse(answer),
            useCount: score,
          });
        }
      }
    }

    res.json(appropriateQuestions);
  } catch (error) {
    res.status(500).json({
      error: "Błąd podczas pobierania FAQ",
      details: error.message,
    });
  }
});

app.post("/chat", validateChatInput, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { message } = req.body;
    conversationStats.messageCount++;

    if (!(await isQuestionAppropriate(message))) {
      return res.status(400).json({
        error:
          "Przepraszam, ale twoje pytanie zawiera niedozwolone słowa. Proszę o kulturalną komunikację.",
      });
    }

    const cachedResponse = await checkCache(message);
    if (cachedResponse) {
      console.log("\n[Cache]: === ODPOWIEDŹ Z CACHE ===");
      return res.json({ reply: cachedResponse });
    }

    console.log("\n[ChatBot]: === NOWE ZAPYTANIE ===");
    console.log(`[ChatBot]: Zapytanie #${conversationStats.messageCount}`);
    console.log(`[ChatBot]: Treść: ${message}`);
    console.log(`[ChatBot]: Długość zapytania: ${message.length} znaków`);
    console.log(
      `[ChatBot]: Szacowana liczba tokenów: ~${countTokens(message)}`
    );
    console.log("[ChatBot]: ====================\n");

    const startTime = Date.now();
    const response = await chain.invoke({
      input: message,
    });
    const finalResponse = response.content;

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const finalResponseLength = finalResponse.length;
    const finalTokenCount = countTokens(finalResponse);

    console.log("\n[ChatBot]: === STATYSTYKI ODPOWIEDZI ===");
    console.log(`[ChatBot]: Czas odpowiedzi: ${responseTime}ms`);
    console.log(`[ChatBot]: Długość tekstu: ${finalResponseLength} znaków`);
    console.log(`[ChatBot]: Szacowana liczba tokenów: ~${finalTokenCount}`);
    console.log("[ChatBot]: ===========================\n");

    await saveToCache(message, finalResponse);
    res.json({ reply: finalResponse });
  } catch (error) {
    console.log("\n[Error]: === BŁĄD PRZETWARZANIA ===");
    console.error(`[Error]: ${error}`);
    console.log("[Error]: ========================\n");
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

      console.log("\n[ChatBot]: === ZMIANA TEMPERATURY ===");
      console.log(`[ChatBot]: Poprzednia temperatura: ${oldTemp}`);
      console.log(`[ChatBot]: Nowa temperatura: ${temperature}`);
      console.log("[ChatBot]: ========================\n");

      global.model = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        temperature: chatbotConfig.temperature,
        modelName: "gpt-4-turbo-preview",
        maxTokens: chatbotConfig.max_tokens,
        streaming: false,
      });

      res.json({
        message: "Zaktualizowano konfigurację",
        newConfig: chatbotConfig,
      });
    } catch (error) {
      console.error(
        "[ChatBot]: Błąd podczas aktualizacji konfiguracji:",
        error
      );
      res.status(500).json({
        error: "Wystąpił błąd podczas aktualizacji konfiguracji",
        details: error.message,
      });
    }
  }
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("[Redis]: Połączono z Redis");
  console.log(`[Server]: Serwer backend działa na porcie: ${PORT}`);
  console.log(
    `[ChatBot]: Temperatura modelu chatbota: ${chatbotConfig.temperature}`
  );
});
