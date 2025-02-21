import { useState, useRef, memo, useContext, useEffect, FC } from "react";
import toast from "react-hot-toast";
import { ThemeContext } from "../../contexts/ThemeContext";
import { useTemperature } from "../../contexts/TemperatureContext";
import { useThemeColors } from "../../hooks/useThemeColors";
import "./TemperatureToggle.scss";

interface TemperatureToggleProps {
  onTemperatureChange?: () => void;
}

const ThermometerIcon: FC = () => (
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

const TemperatureToggle = ({
  onTemperatureChange: propOnTemperatureChange,
}: TemperatureToggleProps) => {
  const { theme } = useContext(ThemeContext);
  useThemeColors(theme);
  const { temperature, updateTemperature } = useTemperature();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localTemperature, setLocalTemperature] = useState(temperature);
  const toggleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalTemperature(temperature);
  }, [temperature]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toggleRef.current &&
        !toggleRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setLocalTemperature(temperature); // Reset to current temperature
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [temperature]);

  const handleTemperatureUpdate = async () => {
    try {
      setIsSaving(true);
      await updateTemperature(localTemperature);
      const message =
        localTemperature > 0.5
          ? "↗️ Zwiększono kreatywność odpowiedzi"
          : "↘️ Ustawiono bardziej konkretne odpowiedzi";
      toast.success(message, {
        id: "temperature-update",
      });
      setIsOpen(false);
      propOnTemperatureChange?.();
    } catch (error) {
      console.error("Błąd podczas aktualizacji temperatury:", error);
      toast.error("Błąd podczas aktualizacji temperatury", {
        id: "temperature-error",
      });
      setLocalTemperature(temperature); // Reset to current temperature on error
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
            <div className="temperature-toggle__tooltip">
              Ustaw wyższą temperaturę, jeśli chcesz bardziej kreatywnych i
              zaskakujących odpowiedzi. Zmniejsz ją, gdy zależy Ci na większej
              spójności i konkretach.
            </div>
            <div className="temperature-control__inputs">
              <label>
                <span className="temperature-value">
                  {localTemperature.toFixed(1)}
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localTemperature}
                  onChange={(e) =>
                    setLocalTemperature(parseFloat(e.target.value))
                  }
                  style={{
                    background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${
                      localTemperature * 100
                    }%, var(--color-background-darker) ${
                      localTemperature * 100
                    }%, var(--color-background-darker) 100%)`,
                  }}
                />
              </label>
              <button
                onClick={handleTemperatureUpdate}
                disabled={isSaving}
                className="save-button"
                title="Zapisz temperaturę"
              >
                {isSaving ? "..." : "✓"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(TemperatureToggle);
