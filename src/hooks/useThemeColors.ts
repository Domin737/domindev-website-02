import { useEffect } from "react";

type ThemeType = "light" | "dark";

interface ThemeColors {
  background: string;
  backgroundDarker: string;
  text: string;
  textSecondary: string;
  darkPurple: string;
}

const themeColorMap: Record<ThemeType, ThemeColors> = {
  dark: {
    background: "#0a0a0f",
    backgroundDarker: "#050508",
    text: "#ffffff",
    textSecondary: "rgba(255, 255, 255, 0.8)",
    darkPurple: "#1a0b2e",
  },
  light: {
    background: "#ffffff",
    backgroundDarker: "#f5f5f5",
    text: "#1a1a1a",
    textSecondary: "rgba(26, 26, 26, 0.8)",
    darkPurple: "#f0e6ff",
  },
};

export const useThemeColors = (theme: ThemeType) => {
  useEffect(() => {
    const colors = themeColorMap[theme];

    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(
        `--color-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`,
        value
      );
    });
  }, [theme]);
};
