import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "redis";
import helmet from "helmet";
import slowDown from "express-slow-down";
import session from "express-session";
import { RedisStore } from "connect-redis";
import cookieParser from "cookie-parser";
import crypto from "crypto";

import {
  ChatController,
  ModerationController,
  CacheController,
} from "./src/controllers/index.mjs";

import { CacheService } from "./src/services/cacheService.mjs";
import { ModerationService } from "./src/services/moderationService.mjs";
import { ChatService } from "./src/services/chatService.mjs";
import { ChatCacheService } from "./src/services/chatCacheService.mjs";
import { ChatStatsService } from "./src/services/chatStatsService.mjs";
import { ChatContextService } from "./src/services/chatContextService.mjs";

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

// Konfiguracja CORS z obsługą ciasteczek
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Credentials",
  ],
  exposedHeaders: ["Set-Cookie", "Date", "ETag"],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Parsowanie ciasteczek i JSON
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));

// Ustawienie nagłówków
app.use((req, res, next) => {
  const origin = req.headers.origin || "http://localhost:5173";
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Allow-Headers, Access-Control-Allow-Origin, Access-Control-Allow-Credentials"
  );
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

redisClient.on("connect", () => {
  console.log("[Redis]: Połączono z Redis");
});

redisClient.on("ready", () => {
  console.log("[Redis]: Redis gotowy do użycia");
});

// Połączenie z Redis
await redisClient.connect().catch((err) => {
  console.error("[Redis]: Błąd połączenia z Redis:", err);
});

// Generowanie bezpiecznego klucza sesji, jeśli nie jest ustawiony w .env
const sessionSecret =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
console.log(
  "[Session]: Używam klucza sesji:",
  sessionSecret.substring(0, 8) + "..."
);

// Konfiguracja sesji z wykorzystaniem RedisStore
const redisStore = new RedisStore({
  client: redisClient,
  prefix: "sess:",
  disableTouch: false,
});

// Konfiguracja sesji
const isDev = process.env.NODE_ENV !== "production";
app.use(
  session({
    store: redisStore,
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    name: "chat.sid",
    proxy: true,
    rolling: true,
    unset: "keep",
    cookie: {
      secure: !isDev, // false w dev, true w produkcji
      httpOnly: true,
      maxAge: 30 * 60 * 1000,
      sameSite: isDev ? "lax" : "none", // lax w dev, none w produkcji
      path: "/",
      domain: isDev ? undefined : process.env.COOKIE_DOMAIN,
    },
  })
);

// Middleware do logowania sesji
app.use((req, res, next) => {
  console.log("[Session]: Request ID:", req.session?.id);
  console.log("[Session]: Session:", req.session);
  console.log("[Session]: Cookies:", req.cookies);
  console.log("[Session]: Headers:", {
    cookie: req.headers.cookie,
    origin: req.headers.origin,
    referer: req.headers.referer,
  });
  next();
});

// Inicjalizacja serwisów
const cacheService = new CacheService(redisClient);
const moderationService = new ModerationService(redisClient);
const chatService = new ChatService();
const chatCacheService = new ChatCacheService(redisClient);
const chatStatsService = new ChatStatsService(redisClient);
const chatContextService = new ChatContextService(redisClient);

// Inicjalizacja kontrolerów
const chatController = new ChatController(
  chatService,
  chatCacheService,
  chatStatsService,
  chatContextService
);
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
    `[ChatBot]: Temperatura modelu chatbota: ${
      chatService.getConfig().temperature
    }`
  );
});
