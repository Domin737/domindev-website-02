import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { BiMessageDetail } from "react-icons/bi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./FloatingChat.scss";

interface ChatResponse {
  reply: string;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const FloatingChat = () => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ text: string; user: string }[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, user: "Ty" };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setInput("");

    try {
      const response = await axios.post<ChatResponse>(`${API_URL}/chat`, {
        message: input,
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
              <div className="welcome-message">
                Witaj! Jestem asystentem DominDev. W czym mogę pomóc?
              </div>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.user === "Ty" ? "user" : "bot"}`}
              >
                {msg.user === "Ty" ? (
                  msg.text
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      strong: ({ node, ...props }) => (
                        <span className="keyword" {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <span className="emphasis" {...props} />
                      ),
                      code: ({ node, ...props }) => (
                        <code className="code-snippet" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="section-header" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="paragraph" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="list-item" {...props} />
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
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

export default FloatingChat;
