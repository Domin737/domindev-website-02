export interface ChatConfig {
  temperature: number;
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
  messageCount: number;
}

export interface FAQItem {
  question: string;
  answers: string[];
  useCount: number;
}

// Typy dla cache i Redis
export interface CacheClearOptions {
  strategy: "all" | "temperature" | "expired";
  temperature?: number;
}

export interface CacheClearResponse {
  message: string;
  strategy: string;
  clearedKeys: number;
}
