import { useState, useRef, memo, useEffect, useContext } from "react";
import axios from "axios";
import { ThemeContext } from "../../contexts/ThemeContext";
import { useThemeColors } from "../../hooks/useThemeColors";
import "./TemperatureToggle.scss";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

interface TemperatureToggleProps {
  onTemperatureChange?: () => void;
}

const ThermometerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a2 2 0 0 0-2 2v10.5c-1.2.7-2 2-2 3.5a4 4 0 1 0 8 0c0-1.5-.8-2.8-2-3.5V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="18" r="2" />
    <line x1="12" y1="9" x2="12" y2="14" />
  </svg>
);

const TemperatureToggle = ({ onTemperatureChange }: TemperatureToggleProps) => {
  const { theme } = useContext(ThemeContext);
  useThemeColors(theme);
  const [isOpen, setIsOpen] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [isSaving, setIsSaving] = useState(false);
  const toggleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toggleRef.current &&
        !toggleRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const updateTemperature = async () => {
    try {
      setIsSaving(true);
      await axios.post(`${API_URL}/update-config`, { temperature });
      alert("Zaktualizowano temperaturę modelu!");
      onTemperatureChange?.();
    } catch (error) {
      console.error("Błąd podczas aktualizacji temperatury:", error);
      alert("Wystąpił błąd podczas aktualizacji temperatury.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="temperature-toggle" ref={toggleRef}>
      <button
        className={`temperature-toggle__button ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Temperatura modelu"
        type="button"
        title="Ustaw temperaturę modelu"
      >
        <ThermometerIcon />
      </button>
      {isOpen && (
        <div className="temperature-toggle__controls active">
          <div className="temperature-control">
            <label>
              <span className="temperature-value">
                {temperature.toFixed(1)}
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                style={{
                  background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${
                    temperature * 100
                  }%, var(--color-background-darker) ${
                    temperature * 100
                  }%, var(--color-background-darker) 100%)`,
                }}
              />
            </label>
            <button
              onClick={updateTemperature}
              disabled={isSaving}
              className="save-button"
            >
              {isSaving ? "..." : "✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(TemperatureToggle);
