import { useState, useEffect, useRef } from "react";
import "./AccentColorToggle.scss";

const themes = {
  pink: {
    primary: "#ff1493",
    secondary: "#9d4edd",
  },
  red: {
    primary: "#ff0000",
    secondary: "#ff4d4d",
  },
  green: {
    primary: "#00ff00",
    secondary: "#4dff4d",
  },
  gray: {
    primary: "#808080",
    secondary: "#a6a6a6",
  },
  gold: {
    primary: "#ffd700",
    secondary: "#daa520",
  },
};

interface AccentColorToggleProps {
  onThemeChange?: () => void;
}

const AccentColorToggle = ({ onThemeChange }: AccentColorToggleProps) => {
  const [currentTheme, setCurrentTheme] = useState("pink");
  const [isOpen, setIsOpen] = useState(false);
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

  const updateThemeColors = (theme: string) => {
    const colors = themes[theme as keyof typeof themes];
    document.documentElement.style.setProperty(
      "--color-primary",
      colors.primary
    );
    document.documentElement.style.setProperty(
      "--color-secondary",
      colors.secondary
    );
    document.documentElement.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
    );
    document.documentElement.style.setProperty(
      "--gradient-text",
      `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
    );
    document.documentElement.style.setProperty(
      "--neon-glow-primary",
      `0 0 10px ${colors.primary}80, 0 0 20px ${colors.primary}4D, 0 0 30px ${colors.primary}1A`
    );
    document.documentElement.style.setProperty(
      "--neon-glow-secondary",
      `0 0 10px ${colors.secondary}80, 0 0 20px ${colors.secondary}4D, 0 0 30px ${colors.secondary}1A`
    );
  };

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    updateThemeColors(theme);
    setIsOpen(false);
    onThemeChange?.();
  };

  useEffect(() => {
    updateThemeColors(currentTheme);
  }, []);

  return (
    <div className="accent-color-toggle" ref={toggleRef}>
      <button
        className={`accent-color-toggle__button ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Zmień kolor akcentów"
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
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      </button>
      <div className={`accent-color-toggle__colors ${isOpen ? "active" : ""}`}>
        {Object.keys(themes).map((theme) => (
          <button
            key={theme}
            className={`accent-color-toggle__color-button accent-color-toggle__color-button--${theme} ${
              currentTheme === theme ? "active" : ""
            }`}
            onClick={() => handleThemeChange(theme)}
            aria-label={`Zmień kolor akcentów na ${theme}`}
          />
        ))}
      </div>
    </div>
  );
};

export default AccentColorToggle;
