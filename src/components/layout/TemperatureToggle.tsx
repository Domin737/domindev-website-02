import { useState, useRef, memo, useEffect } from "react";
import axios from "axios";
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
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
);

const TemperatureToggle = ({ onTemperatureChange }: TemperatureToggleProps) => {
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
      >
        <ThermometerIcon />
      </button>
      <div className={`temperature-toggle__controls ${isOpen ? "active" : ""}`}>
        <div className="temperature-control">
          <label>
            <span className="temperature-value">{temperature}</span>
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
            {isSaving ? "..." : "✓"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(TemperatureToggle);
