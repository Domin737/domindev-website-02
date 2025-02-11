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
}

interface FrequentQuestion {
  question: string;
  useCount: number;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

interface FloatingChatProps {}

const FloatingChat: React.FC<FloatingChatProps> = () => {
  const { addTemperatureListener, temperature } = useTemperature();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLongLoadingMessage, setShowLongLoadingMessage] = useState(false);
  const [frequentQuestions, setFrequentQuestions] = useState<
    FrequentQuestion[]
  >([]);
  const loadingTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchFrequentQuestions();
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

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Zabezpieczenie przed race condition - zapisanie aktualnej wartości input
    const currentInput = input.trim();
    const userMessage = { text: currentInput, user: "Ty" };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setShowLongLoadingMessage(false);
    setInput("");

    // Ustawienie timera na 10 sekund
    loadingTimerRef.current = setTimeout(() => {
      setShowLongLoadingMessage(true);
    }, 10000);

    try {
      const response = await axios.post<ChatResponse>(`${API_URL}/chat`, {
        message: currentInput,
      });
      setMessages((prev) => [
        ...prev,
        { text: response.data.reply, user: "Bot" },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { text: "Błąd serwera. Spróbuj ponownie.", user: "Bot" },
      ]);
    } finally {
      setIsLoading(false);
      setShowLongLoadingMessage(false);
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    }
  };

  // Automatyczne przewijanie do najnowszej wiadomości
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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
              <>
                <div className="welcome-message">
                  Witaj! Jestem asystentem DominDev. W czym mogę pomóc?
                </div>
                {frequentQuestions.length > 0 && (
                  <div className="suggested-questions">
                    <div className="suggested-questions-header">
                      Popularne pytania:
                    </div>
                    {frequentQuestions.map((fq, index) => (
                      <button
                        key={index}
                        className="suggested-question"
                        onClick={() => {
                          setInput(fq.question);
                          sendMessage();
                        }}
                      >
                        {fq.question}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.user === "Ty" ? "user" : "bot"} ${
                  msg.isTemperatureChange ? "temperature-change" : ""
                }`}
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
                {showLongLoadingMessage && (
                  <div className="long-loading-message">
                    Proszę o cierpliwość. Odpowiedź jest obszerna i wymaga
                    więcej czasu...
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="chat-input-form">
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
            <button onClick={sendMessage}>Wyślij</button>
          </div>
        </div>
      )}
    </div>
  );
};

export type { FloatingChatProps };
export default FloatingChat;
