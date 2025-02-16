export enum ChatErrorCode {
  EMPTY_MESSAGE = "EMPTY_MESSAGE",
  MESSAGE_TOO_LONG = "MESSAGE_TOO_LONG",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  STATS_ERROR = "STATS_ERROR",
  INVALID_TEMPERATURE = "INVALID_TEMPERATURE",
  CONTEXT_ERROR = "CONTEXT_ERROR",
  SESSION_ERROR = "SESSION_ERROR",
  CACHE_ERROR = "CACHE_ERROR",
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ChatContext {
  messages: ChatMessage[];
  sessionId: string;
}

export interface ChatContextStats {
  activeSessions: number;
  sessions: {
    sessionId: string;
    messageCount: number;
    ttl: number;
  }[];
}

export interface ChatContextResponse {
  message: string;
  sessionId: string;
  role?: string;
}

export interface ChatContextError {
  message: string;
  code: number;
  details?: string;
}

export interface ChatTemperature {
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface ChatResponse {
  content: string;
  source?: "cache" | "model";
  temperature?: number;
  timestamp?: number;
}

export interface ChatStats {
  questions: {
    question: string;
    answers: ChatResponse[];
    useCount: number;
    temperature?: number;
  }[];
  total: number;
  limit: number;
}
