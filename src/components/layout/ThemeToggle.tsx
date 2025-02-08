import { useState, useEffect, useRef } from "react";
import "./ThemeToggle.scss";

interface ThemeToggleProps {
  onThemeChange?: () => void;
}

const ThemeToggle = ({ onThemeChange }: ThemeToggleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
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

  const updateThemeColors = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.style.setProperty(
        "--color-background",
        "#0a0a0f"
      );
      document.documentElement.style.setProperty(
        "--color-background-darker",
        "#050508"
      );
      document.documentElement.style.setProperty("--color-text", "#ffffff");
      document.documentElement.style.setProperty(
        "--color-text-secondary",
        "rgba(255, 255, 255, 0.8)"
      );
      document.documentElement.style.setProperty(
        "--color-dark-purple",
        "#1a0b2e"
      );
    } else {
      document.documentElement.style.setProperty(
        "--color-background",
        "#ffffff"
      );
      document.documentElement.style.setProperty(
        "--color-background-darker",
        "#f5f5f5"
      );
      document.documentElement.style.setProperty("--color-text", "#1a1a1a");
      document.documentElement.style.setProperty(
        "--color-text-secondary",
        "rgba(26, 26, 26, 0.8)"
      );
      document.documentElement.style.setProperty(
        "--color-dark-purple",
        "#f0e6ff"
      );
    }
  };

  const handleThemeChange = (isDark: boolean) => {
    setIsDarkTheme(isDark);
    updateThemeColors(isDark);
    setIsOpen(false);
    onThemeChange?.();
  };

  useEffect(() => {
    updateThemeColors(isDarkTheme);
  }, []);

  return (
    <div className="theme-toggle" ref={toggleRef}>
      <button
        className={`theme-toggle__button ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Zmień motyw"
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
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </button>
      <div className={`theme-toggle__modes ${isOpen ? "active" : ""}`}>
        <button
          className={`theme-toggle__mode-button theme-toggle__mode-button--dark ${
            isDarkTheme ? "active" : ""
          }`}
          onClick={() => handleThemeChange(true)}
          aria-label="Tryb ciemny"
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
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
        <button
          className={`theme-toggle__mode-button theme-toggle__mode-button--light ${
            !isDarkTheme ? "active" : ""
          }`}
          onClick={() => handleThemeChange(false)}
          aria-label="Tryb jasny"
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
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ThemeToggle;
