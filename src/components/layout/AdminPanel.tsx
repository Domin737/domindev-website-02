import { useState, useEffect, useRef } from "react";
import axios from "axios";
import AccentColorToggle from "./AccentColorToggle";
import ThemeToggle from "./ThemeToggle";
import FontToggle from "./FontToggle";
import "./AdminPanel.scss";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const AdminPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [isSaving, setIsSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const updateTemperature = async () => {
    try {
      setIsSaving(true);
      await axios.post(`${API_URL}/update-config`, { temperature });
      alert("Zaktualizowano temperaturę modelu!");
    } catch (error) {
      console.error("Błąd podczas aktualizacji temperatury:", error);
      alert("Wystąpił błąd podczas aktualizacji temperatury.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="admin-panel" ref={panelRef}>
      <button
        className={`admin-panel__button ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Panel administracyjny"
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
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
      <div className={`admin-panel__menu ${isOpen ? "active" : ""}`}>
        <div className="admin-panel__menu-item">
          <ThemeToggle onThemeChange={() => setIsOpen(false)} />
        </div>
        <div className="admin-panel__menu-item">
          <AccentColorToggle onThemeChange={() => setIsOpen(false)} />
        </div>
        <div className="admin-panel__menu-item">
          <FontToggle onFontChange={() => setIsOpen(false)} />
        </div>
        <div className="admin-panel__menu-item chatbot-settings">
          <h3>Ustawienia Chatbota</h3>
          <div className="temperature-control">
            <label>
              Temperatura modelu: {temperature}
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </label>
            <button
              onClick={updateTemperature}
              disabled={isSaving}
              className="save-button"
            >
              {isSaving ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
