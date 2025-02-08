import { useState, useEffect } from "react";
import "./ThemeToggle.scss";

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
};

const ThemeToggle = () => {
  const [currentTheme, setCurrentTheme] = useState("pink");

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
  };

  useEffect(() => {
    updateThemeColors(currentTheme);
  }, []);

  return (
    <div className="theme-toggle">
      {Object.keys(themes).map((theme) => (
        <button
          key={theme}
          className={`theme-toggle__button theme-toggle__button--${theme} ${
            currentTheme === theme ? "active" : ""
          }`}
          onClick={() => handleThemeChange(theme)}
          aria-label={`Zmień motyw na ${theme}`}
        />
      ))}
    </div>
  );
};

export default ThemeToggle;
