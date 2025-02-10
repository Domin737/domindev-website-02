import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { IoChatbubblesOutline } from "react-icons/io5";
import "./FloatingChat.scss";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

interface Message {
  type: "user" | "bot";
  content: string;
}

interface ChatResponse {
  reply: string;
}

const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        chatRef.current &&
        !chatRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { type: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post<ChatResponse>(`${API_URL}/chat`, {
        message: userMessage,
      });
      setMessages((prev) => [
        ...prev,
        { type: "bot", content: response.data.reply },
      ]);
    } catch (error) {
      console.error("Błąd podczas wysyłania wiadomości:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: "Przepraszam, wystąpił błąd. Spróbuj ponownie później.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`floating-chat ${isOpen ? "open" : ""}`} ref={chatRef}>
      <button
        className="floating-chat-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Zamknij czat" : "Otwórz czat"}
      >
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
          <IoChatbubblesOutline />
        )}
      </button>

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Asystent DominDev</h3>
          </div>
          <div className="messages-container">
            {messages.length === 0 && (
              <div className="welcome-message">
                Witaj! Jestem asystentem DominDev. W czym mogę pomóc?
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.type}`}>
                {msg.content}
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
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSubmit} className="chat-input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Napisz wiadomość..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              Wyślij
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default FloatingChat;
