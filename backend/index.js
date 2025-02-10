require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ChatOpenAI } = require("langchain/chat_models/openai");
const { ConversationChain } = require("langchain/chains");
const { BufferMemory } = require("langchain/memory");
const {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} = require("langchain/prompts");

const app = express();
app.use(cors());
app.use(express.json());

let chatbotConfig = { temperature: 0.7 };

// Tworzenie szablonu promptu
const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    `Jesteś asystentem DominDev - firmy zajmującej się tworzeniem stron internetowych i aplikacji webowych.
    Twoje odpowiedzi powinny być profesjonalne, ale przyjazne.
    Specjalizujesz się w:
    - Tworzeniu stron internetowych
    - Tworzeniu aplikacji webowych
    - React i TypeScript
    - Optymalizacji wydajności
    - UX/UI Design`
  ),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);

const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: chatbotConfig.temperature,
  modelName: "gpt-4-turbo-preview",
});

const memory = new BufferMemory();
const chain = new ConversationChain({
  llm: model,
  memory: memory,
  prompt: chatPrompt,
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const response = await chain.call({ input: message });
    res.json({ reply: response.response });
  } catch (error) {
    console.error("Błąd podczas przetwarzania wiadomości:", error);
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
    model.temperature = temperature;

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
  console.log(`Serwer działa na porcie ${PORT}`);
  console.log(`Temperatura modelu: ${chatbotConfig.temperature}`);
});
