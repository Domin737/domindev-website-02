import { useState, useEffect, useRef } from "react";
import "./FontToggle.scss";

const fonts = {
  default: {
    fontFamily: "'Inter', sans-serif",
  },
  jetbrains: {
    fontFamily: "'JetBrains Mono', monospace",
  },
  playfair: {
    fontFamily: "'Playfair Display', serif",
  },
  pacifico: {
    fontFamily: "'Pacifico', cursive",
  },
  ubuntuMono: {
    fontFamily: "'Ubuntu Mono', monospace",
  },
};

interface FontToggleProps {
  onFontChange?: () => void;
}

const FontToggle = ({ onFontChange }: FontToggleProps) => {
  const [currentFont, setCurrentFont] = useState("default");
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

  const updateFont = (font: string) => {
    const selectedFont = fonts[font as keyof typeof fonts];
    document.documentElement.style.setProperty(
      "--font-primary",
      selectedFont.fontFamily
    );
  };

  const handleFontChange = (font: string) => {
    setCurrentFont(font);
    updateFont(font);
    setIsOpen(false);
    onFontChange?.();
  };

  useEffect(() => {
    updateFont(currentFont);
  }, []);

  return (
    <div className="font-toggle" ref={toggleRef}>
      <button
        className={`font-toggle__button ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Zmień czcionkę"
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
          <text x="6" y="20" fontSize="20">
            A
          </text>
          <text x="12" y="12" fontSize="12">
            A
          </text>
        </svg>
      </button>
      <div className={`font-toggle__fonts ${isOpen ? "active" : ""}`}>
        {Object.keys(fonts).map((font) => (
          <div key={font} className="font-toggle__font-item">
            <button
              className={`font-toggle__font-button font-toggle__font-button--${font} ${
                currentFont === font ? "active" : ""
              }`}
              onClick={() => handleFontChange(font)}
              aria-label={`Zmień czcionkę na ${font}`}
            >
              Aa
            </button>
            <span className="font-toggle__tooltip">
              {font === "default"
                ? "Inter (Domyślna)"
                : font === "jetbrains"
                ? "JetBrains Mono"
                : font === "playfair"
                ? "Playfair Display"
                : font === "pacifico"
                ? "Pacifico"
                : "Ubuntu Mono"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FontToggle;
