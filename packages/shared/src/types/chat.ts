export interface ChatConfig {
  temperature: number; // Wartość między 0 a 1
  max_tokens: number;
}

export interface ChatMessage {
  message: string;
}

export interface ChatResponse {
  reply: string;
  error?: string;
}

export interface ChatStats {
  message: string;
  question: string;
  useCount: number;
}

export interface FAQItem {
  question: string;
  answers: ChatResponse[];
  useCount: number;
}

export interface FAQResponse {
  questions: FAQItem[];
  total: number;
  limit: number;
}

// Typy dla cache i Redis
export interface CacheClearOptions {
  strategy: "all" | "temperature" | "expired" | "stats";
  temperature?: number;
}

export interface CacheClearResponse {
  message: string;
  strategy: string;
  clearedKeys: number;
}

// Typy dla błędów
export enum ChatErrorCode {
  EMPTY_MESSAGE = "EMPTY_MESSAGE",
  MESSAGE_TOO_LONG = "MESSAGE_TOO_LONG",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  MODERATION_FAILED = "MODERATION_FAILED",
  CACHE_ERROR = "CACHE_ERROR",
  STATS_ERROR = "STATS_ERROR",
  INVALID_TEMPERATURE = "INVALID_TEMPERATURE",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

export interface ChatError {
  code: ChatErrorCode;
  message: string;
  details?: any;
}

// Typy dla walidacji
export interface ValidationResult {
  isValid: boolean;
  error?: ChatError;
}

// Typy dla konfiguracji
export interface ConfigUpdateRequest {
  temperature?: number; // Wartość między 0 a 1
  max_tokens?: number;
}

export interface ConfigUpdateResponse {
  message: string;
  config: ChatConfig;
}
