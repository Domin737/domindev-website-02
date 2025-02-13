import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "redis";
import helmet from "helmet";
import slowDown from "express-slow-down";

import {
  ChatController,
  ModerationController,
  CacheController,
} from "./src/controllers/index.mjs";

import { CacheService } from "./src/services/cacheService.mjs";
import { ModerationService } from "./src/services/moderationService.mjs";

import {
  createChatRouter,
  createModerationRouter,
  createCacheRouter,
} from "./src/routes/index.mjs";

import {
  errorHandler,
  notFoundHandler,
} from "./src/middleware/errorHandler.mjs";

const app = express();

// Podstawowe zabezpieczenia HTTP
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "100kb", extended: true }));
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// Spowalniacz dla częstych żądań
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 30,
  delayMs: (hits) => hits * 200,
  maxDelayMs: 2000,
});

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

// Inicjalizacja serwisów
const cacheService = new CacheService(redisClient);
const moderationService = new ModerationService(redisClient);

// Inicjalizacja kontrolerów
const chatController = new ChatController(redisClient);
const moderationController = new ModerationController(moderationService);
const cacheController = new CacheController(cacheService);

// Konfiguracja routerów
app.use(createChatRouter(chatController, moderationController));
app.use(createModerationRouter(moderationController));
app.use(createCacheRouter(cacheController));

// Obsługa błędów
app.use(notFoundHandler); // 404 dla nieistniejących endpointów
app.use(errorHandler); // Globalny handler błędów

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("[Redis]: Połączono z Redis");
  console.log(`[Server]: Serwer backend działa na porcie: ${PORT}`);
  console.log(
    `[ChatBot]: Temperatura modelu chatbota: ${chatController.config.temperature}`
  );
});
