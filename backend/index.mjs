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
  max_tokens: 200, // Zmniejszony limit tokenów
};

let conversationStats = {
  messageCount: 0,
};

// Tworzenie szablonu promptu
const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `Jesteś asystentem DominDev - firmy zajmującej się tworzeniem stron internetowych i aplikacji webowych.
    Odpowiadasz TYLKO na pytania dotyczące:
    - Tworzenia stron internetowych
    - Tworzenia aplikacji webowych
    - React i TypeScript
    - Optymalizacji wydajności
    - UX/UI Design
    - Współpracy z DominDev
    
    WAŻNE ZASADY:
    1. Odpowiadaj ZWIĘŹLE i KONKRETNIE
    2. Unikaj długich wyjaśnień i przykładów
    3. Skup się na najważniejszych informacjach
    4. Jeśli pytanie NIE DOTYCZY wymienionych tematów, odpowiadaj krótko: "Nie mogę udzielić odpowiedzi na to pytanie."
    5. Maksymalna długość odpowiedzi to 2-3 zdania.`
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

    // Zapisanie odpowiedzi AI w pamięci
    await memory.saveContext({ input: message }, { output: response.content });

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

    res.json({ reply: response.content });
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
