import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
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
app.use(express.json({ limit: "100kb", extended: true })); // Limit wielkości żądań
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

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

// Limit dla operacji na zabronionych słowach
const bannedWordsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 godzina
  max: 1000, // limit 1000 żądań na godzinę
  message:
    "Przekroczono limit operacji na zabronionych słowach. Spróbuj ponownie później.",
});

// Limit dla odczytu listy zabronionych słów
const bannedWordsGetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 30, // limit 30 żądań na 15 minut
  message:
    "Przekroczono limit odczytów listy zabronionych słów. Spróbuj ponownie później.",
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

// Inicjalizacja klientów baz danych
const mongoClient = new MongoClient(
  process.env.DB_URI || "mongodb://localhost:27017"
);
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

// Połączenie z MongoDB
await mongoClient
  .connect()
  .catch((err) => console.error("[MongoDB]: Error:", err));
const db = mongoClient.db("chatbot");
const questionsCollection = db.collection("frequent_questions");
const bannedWordsCollection = db.collection("banned_words");

// Cache dla zabronionych słów
let bannedWordsCache = [];
let bannedWordsCacheTime = 0;
const BANNED_WORDS_CACHE_TTL = 5 * 60 * 1000; // 5 minut

// Funkcja do pobierania zabronionych słów z cache lub bazy
const getBannedWords = async () => {
  const now = Date.now();
  if (now - bannedWordsCacheTime < BANNED_WORDS_CACHE_TTL) {
    return bannedWordsCache;
  }

  try {
    const words = await bannedWordsCollection.find({}).toArray();
    bannedWordsCache = words.map((w) => w.word);
    bannedWordsCacheTime = now;
    return bannedWordsCache;
  } catch (error) {
    console.error(
      "[MongoDB]: Błąd podczas pobierania zabronionych słów:",
      error
    );
    return bannedWordsCache; // Użyj cache w przypadku błędu
  }
};

// Funkcja sprawdzająca czy tekst zawiera zabronione słowa
const containsBannedWords = async (text) => {
  const bannedWords = await getBannedWords();
  const normalizedText = text.toLowerCase();
  return bannedWords.some((word) => normalizedText.includes(word));
};

// Odśwież cache zabronionych słów przy starcie
getBannedWords().then(() => {
  console.log("[Cache]: Zainicjalizowano cache zabronionych słów");
});

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
      await bannedWordsCollection.updateOne(
        { word: word.toLowerCase() },
        { $set: { word: word.toLowerCase() } },
        { upsert: true }
      );
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
    await bannedWordsCollection.deleteOne({ word: word.toLowerCase() });
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
    const words = await bannedWordsCollection.find({}).toArray();
    res.json(words);
  } catch (error) {
    res.status(500).json({
      error: "Błąd podczas pobierania listy zabronionych słów",
      details: error.message,
    });
  }
});

// Funkcja do normalizacji pytania (usuwa białe znaki, zamienia na małe litery)
const normalizeQuestion = (question) => {
  return question.toLowerCase().trim().replace(/\s+/g, " ");
};

// Funkcja do sprawdzania cache'a Redis
const checkCache = async (question) => {
  const normalizedQuestion = normalizeQuestion(question);
  const cached = await redisClient.get(`q:${normalizedQuestion}`);
  if (cached) {
    // Aktualizuj licznik użyć w MongoDB asynchronicznie, nie czekając na wynik
    questionsCollection
      .updateOne(
        { question: normalizedQuestion },
        {
          $inc: { useCount: 1 },
          $set: { lastUsed: new Date() },
        },
        { upsert: true }
      )
      .catch((err) =>
        console.error("[MongoDB]: Błąd aktualizacji statystyk:", err)
      );

    return JSON.parse(cached);
  }
  return null;
};

// Funkcja do zapisywania w cache'u
const saveToCache = async (question, answer) => {
  const normalizedQuestion = normalizeQuestion(question);

  // Sprawdź czy pytanie jest odpowiednie
  if (await isQuestionAppropriate(normalizedQuestion)) {
    // Zapisz w Redis z czasem wygaśnięcia 24h
    await redisClient.setEx(
      `q:${normalizedQuestion}`,
      24 * 60 * 60,
      JSON.stringify(answer)
    );

    // Zapisz/zaktualizuj w MongoDB asynchronicznie
    questionsCollection
      .updateOne(
        { question: normalizedQuestion },
        {
          $inc: { useCount: 1 },
          $set: {
            answer,
            lastUsed: new Date(),
          },
        },
        { upsert: true }
      )
      .catch((err) => console.error("[MongoDB]: Błąd zapisu statystyk:", err));
  } else {
    console.log(
      "\x1b[33m%s\x1b[0m",
      "\n[Cache]: === POMINIĘTO ZAPIS PYTANIA ==="
    );
    console.log(
      "\x1b[37m%s\x1b[0m",
      "[Cache]: Pytanie zawiera niedozwolone słowa"
    );
    console.log(
      "\x1b[33m%s\x1b[0m",
      "[Cache]: ==============================\n"
    );
  }
};

let chatbotConfig = {
  temperature: 0.5,
  max_tokens: 800, // Zwiększony limit tokenów dla pełniejszych odpowiedzi
};

let conversationStats = {
  messageCount: 0,
};

// Tworzenie szablonu promptu
const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `Asystent DominDev - WordPress, WooCommerce, SEO, marketing online.

    Zakres: WordPress, custom kod, WooCommerce, SEO, CRM/ERP, UX/UI, hosting, AI, technologie webowe.

    Format: **kluczowe**, _ważne_, \`kod\`, listy, ### nagłówki.

    Zasady:
    - Zwięźle: 3-4 zdania na punkt
    - Max 5 punktów
    - Tylko kluczowe informacje
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
  streaming: false, // Wyłączamy streaming, gdyż nie jest wykorzystywany
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

// Endpoint do pobierania najczęściej zadawanych pytań
app.get("/faq", async (req, res) => {
  try {
    const allQuestions = await questionsCollection
      .find({})
      .sort({ useCount: -1 })
      .toArray();

    // Filtruj pytania przed wysłaniem
    const appropriateQuestions = [];
    for (const question of allQuestions) {
      if (await isQuestionAppropriate(question.question)) {
        appropriateQuestions.push(question);
        if (appropriateQuestions.length >= 10) break;
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
  // Sprawdź błędy walidacji
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { message } = req.body;
    conversationStats.messageCount++;

    // Sprawdź czy pytanie zawiera niedozwolone słowa
    if (!(await isQuestionAppropriate(message))) {
      return res.status(400).json({
        error:
          "Przepraszam, ale twoje pytanie zawiera niedozwolone słowa. Proszę o kulturalną komunikację.",
      });
    }

    // Sprawdź cache
    const cachedResponse = await checkCache(message);
    if (cachedResponse) {
      console.log("\x1b[32m%s\x1b[0m", "\n[Cache]: === ODPOWIEDŹ Z CACHE ===");
      return res.json({ reply: cachedResponse });
    }
    console.log("\x1b[36m%s\x1b[0m", "\n[ChatBot]: === NOWE ZAPYTANIE ===");
    console.log(
      "\x1b[37m%s\x1b[0m",
      `[ChatBot]: Zapytanie #${conversationStats.messageCount}`
    );
    console.log("\x1b[37m%s\x1b[0m", `[ChatBot]: Treść: ${message}`);
    console.log(
      "\x1b[37m%s\x1b[0m",
      `[ChatBot]: Długość zapytania: ${message.length} znaków`
    );
    console.log(
      "\x1b[37m%s\x1b[0m",
      `[ChatBot]: Szacowana liczba tokenów: ~${countTokens(message)}`
    );
    console.log("\x1b[36m%s\x1b[0m", "[ChatBot]: ====================\n");

    const startTime = Date.now();

    // Generuj odpowiedź
    const response = await chain.invoke({
      input: message,
    });

    const finalResponse = response.content;

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const finalResponseLength = finalResponse.length;
    const finalTokenCount = countTokens(finalResponse);

    console.log(
      "\x1b[32m%s\x1b[0m",
      "\n[ChatBot]: === STATYSTYKI ODPOWIEDZI ==="
    );
    console.log(
      "\x1b[37m%s\x1b[0m",
      `[ChatBot]: Czas odpowiedzi: ${responseTime}ms`
    );
    console.log(
      "\x1b[37m%s\x1b[0m",
      `[ChatBot]: Długość tekstu: ${finalResponseLength} znaków`
    );
    console.log(
      "\x1b[37m%s\x1b[0m",
      `[ChatBot]: Szacowana liczba tokenów: ~${finalTokenCount}`
    );
    console.log(
      "\x1b[32m%s\x1b[0m",
      "[ChatBot]: ===========================\n"
    );

    // Zapisz odpowiedź do cache'a
    await saveToCache(message, finalResponse);

    // Wyślij odpowiedź
    res.json({ reply: finalResponse });
  } catch (error) {
    console.log("\x1b[31m%s\x1b[0m", "\n[Error]: === BŁĄD PRZETWARZANIA ===");
    console.error("\x1b[31m%s\x1b[0m", `[Error]: ${error}`);
    console.log("\x1b[31m%s\x1b[0m", "[Error]: ========================\n");
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

      console.log(
        "\x1b[33m%s\x1b[0m",
        "\n[ChatBot]: === ZMIANA TEMPERATURY ==="
      );
      console.log(
        "\x1b[37m%s\x1b[0m",
        `[ChatBot]: Poprzednia temperatura: ${oldTemp}`
      );
      console.log(
        "\x1b[37m%s\x1b[0m",
        `[ChatBot]: Nowa temperatura: ${temperature}`
      );
      console.log("\x1b[33m%s\x1b[0m", "[ChatBot]: ========================\n");

      // Aktualizacja modelu
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
  console.log("[Redis]: Połączono z bazą Redis");
  console.log("[MongoDB]: Połączono z bazą MongoDB");
  console.log(`[Server]: Serwer backend działa na porcie: ${PORT}`);
  console.log(
    `[ChatBot]: Temperatura modelu chatbota: ${chatbotConfig.temperature}`
  );
});
