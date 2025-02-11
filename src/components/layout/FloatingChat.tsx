import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { BiMessageDetail } from "react-icons/bi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTemperature } from "../../contexts/TemperatureContext";
import "./FloatingChat.scss";

interface ChatResponse {
  reply: string;
}

interface ChatMessage {
  text: string | React.ReactNode;
  user: string;
  isTemperatureChange?: boolean;
  isError?: boolean;
}

interface FrequentQuestion {
  question: string;
  useCount: number;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

interface FloatingChatProps {}

const FloatingChat: React.FC<FloatingChatProps> = () => {
  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const { addTemperatureListener, temperature } = useTemperature();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLongLoadingMessage, setShowLongLoadingMessage] = useState(false);
  const [frequentQuestions, setFrequentQuestions] = useState<
    FrequentQuestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const loadingTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const inactivityTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Resetuj timer nieaktywności
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (isOpen) {
      inactivityTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 300000); // 5 minut nieaktywności
    }
  };

  // Resetuj timer przy każdej interakcji
  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isOpen, messages]);

  const toggleChat = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (newIsOpen) {
      fetchFrequentQuestions();
      resetInactivityTimer();
    } else if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  };

  const fetchFrequentQuestions = async () => {
    try {
      const response = await axios.get<FrequentQuestion[]>(`${API_URL}/faq`);
      setFrequentQuestions(response.data);
    } catch (error) {
      console.error("Błąd podczas pobierania FAQ:", error);
    }
  };

  // Nasłuchuj na zmiany temperatury
  useEffect(() => {
    const handleTemperatureChange = () => {
      let icon = "📝";
      let description = "Odpowiedzi będą teraz bardziej spójne i konkretne.";

      if (temperature > 0.5) {
        icon = "🎨";
        description = "Odpowiedzi będą teraz bardziej kreatywne i zaskakujące.";
      } else if (temperature === 0.5) {
        icon = "⚖️";
        description =
          "Odpowiedzi będą teraz wyważone pomiędzy kreatywnością a spójnością.";
      }

      const message = (
        <div>
          <div className="temperature-message">
            <span className="temperature-icon">{icon}</span>
            Zmieniono temperaturę modelu na: {temperature.toFixed(1)}
          </div>
          <div className="temperature-description">{description}</div>
        </div>
      );

      setMessages((prev) => [
        ...prev,
        {
          text: message,
          user: "Bot",
          isTemperatureChange: true,
        },
      ]);
    };

    return addTemperatureListener(handleTemperatureChange);
  }, [addTemperatureListener, temperature]);

  // Reset stanu ładowania przy odmontowaniu komponentu
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  const [currentStreamedResponse, setCurrentStreamedResponse] = useState("");

  // Funkcja do wysyłania wiadomości i obsługi odpowiedzi
  const handleMessageSend = async (message: string) => {
    resetInactivityTimer();

    // Dodaj wiadomość użytkownika
    setMessages((prev) => [...prev, { text: message, user: "Ty" }]);
    setIsLoading(true);
    setShowLongLoadingMessage(false);
    setCurrentStreamedResponse("");

    // Timer dla długich odpowiedzi
    loadingTimerRef.current = setTimeout(() => {
      setShowLongLoadingMessage(true);
    }, 10000);

    try {
      const response = await axios.post<ChatResponse>(`${API_URL}/chat`, {
        message: message,
      });

      setMessages((prev) => [
        ...prev,
        { text: response.data.reply, user: "Bot" },
      ]);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Błąd serwera. Spróbuj ponownie.";
      setMessages((prev) => [
        ...prev,
        {
          text: errorMessage,
          user: "Bot",
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      setShowLongLoadingMessage(false);
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    }
  };

  // Handler dla przycisku "Wyślij"
  const sendMessage = async () => {
    if (!input.trim()) return;
    const message = input.trim();
    setInput("");
    await handleMessageSend(message);
  };

  // Automatyczne przewijanie do najnowszej wiadomości lub sugestii
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    } else if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading, showSuggestions]);

  return (
    <div className="floating-chat">
      <button className="floating-chat-toggle" onClick={toggleChat}>
        {isOpen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <BiMessageDetail />
        )}
      </button>

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">Asystent DominDev</div>
          <div className="messages-container" ref={messagesContainerRef}>
            {messages.length === 0 && (
              <div className="welcome-message">
                Witaj! Jestem asystentem DominDev. W czym mogę pomóc?
              </div>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.user === "Ty" ? "user" : "bot"} ${
                  msg.isTemperatureChange ? "temperature-change" : ""
                } ${msg.isError ? "error-message" : ""}`}
              >
                {msg.user === "Ty" ? (
                  msg.text
                ) : typeof msg.text === "string" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <div className="paragraph">{children}</div>
                      ),
                      code: ({ children }) => (
                        <span className="code-snippet">{children}</span>
                      ),
                      em: ({ children }) => (
                        <span className="emphasis">{children}</span>
                      ),
                      strong: ({ children }) => (
                        <span className="keyword">{children}</span>
                      ),
                      h3: ({ children }) => (
                        <div className="section-header">{children}</div>
                      ),
                      ul: ({ children }) => (
                        <ul className="list unordered">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list ordered">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="list-item">{children}</li>
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            ))}
            {isLoading && (
              <div className="message bot loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            {isLoading && showLongLoadingMessage && (
              <div className="message bot loading-status">
                <div className="long-loading-message">
                  <div className="loading-icon">⏳</div>
                  <div className="loading-text">
                    Generuję obszerną odpowiedź...
                    <br />
                    <span className="loading-subtext">
                      To może potrwać kilka sekund
                    </span>
                  </div>
                </div>
              </div>
            )}
            {showSuggestions && frequentQuestions.length > 0 && (
              <div className="suggested-questions" ref={lastMessageRef}>
                <div className="suggested-questions-header">
                  WASZE najpopularniejsze zapytania:
                </div>
                {frequentQuestions
                  .sort((a, b) => b.useCount - a.useCount)
                  .slice(0, 5)
                  .map((fq, index) => (
                    <button
                      key={index}
                      className="suggested-question"
                      onClick={() => handleMessageSend(fq.question)}
                    >
                      {capitalizeFirstLetter(fq.question)}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="chat-input-form">
            <button
              className={`toggle-suggestions-btn ${
                showSuggestions ? "active" : ""
              }`}
              onClick={() => setShowSuggestions(!showSuggestions)}
              title={showSuggestions ? "Ukryj sugestie" : "Pokaż sugestie"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12" y2="17" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Zadaj pytanie..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />
            <button
              onClick={sendMessage}
              className="send-message-btn"
              title="Wyślij wiadomość"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export type { FloatingChatProps };
export default FloatingChat;
