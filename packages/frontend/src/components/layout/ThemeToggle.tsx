import { useState, useEffect, useRef, useContext, memo } from "react";
import { ThemeContext } from "../../contexts/ThemeContext";
import { useThemeColors } from "../../hooks/useThemeColors";
import "./ThemeToggle.scss";

interface ThemeToggleProps {
  onThemeChange?: () => void;
}

interface ThemeButtonProps {
  isActive: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}

const ThemeButton = memo(
  ({ isActive, onClick, ariaLabel, children }: ThemeButtonProps) => (
    <button
      className={`theme-toggle__mode-button theme-toggle__mode-button--${
        ariaLabel.includes("ciemny") ? "dark" : "light"
      } ${isActive ? "active" : ""}`}
      onClick={onClick}
      aria-label={ariaLabel}
      type="button"
    >
      {children}
    </button>
  )
);

ThemeButton.displayName = "ThemeButton";

const SunIcon = () => (
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
);

const MoonIcon = () => (
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
);

const ThemeToggle = ({ onThemeChange }: ThemeToggleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useContext(ThemeContext);
  const toggleRef = useRef<HTMLDivElement>(null);

  // Zastosuj hook do zarządzania kolorami
  useThemeColors(theme);

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

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    setIsOpen(false);
    onThemeChange?.();
  };

  return (
    <div className="theme-toggle" ref={toggleRef}>
      <button
        className={`theme-toggle__button ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Zmień motyw"
        type="button"
      >
        <SunIcon />
      </button>
      <div className={`theme-toggle__modes ${isOpen ? "active" : ""}`}>
        <ThemeButton
          isActive={theme === "dark"}
          onClick={() => handleThemeChange("dark")}
          ariaLabel="Tryb ciemny"
        >
          <MoonIcon />
        </ThemeButton>
        <ThemeButton
          isActive={theme === "light"}
          onClick={() => handleThemeChange("light")}
          ariaLabel="Tryb jasny"
        >
          <SunIcon />
        </ThemeButton>
      </div>
    </div>
  );
};

export default ThemeToggle;
