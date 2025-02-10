import { useEffect } from "react";

type ThemeType = "light" | "dark";

interface ThemeColors {
  background: string;
  backgroundDarker: string;
  text: string;
  textSecondary: string;
  darkPurple: string;
  backgroundTransparent: string;
  chatMessageBackground: string;
}

const themeColorMap: Record<ThemeType, ThemeColors> = {
  dark: {
    background: "#0a0a0f",
    backgroundDarker: "#050508",
    text: "#ffffff",
    textSecondary: "rgba(255, 255, 255, 0.8)",
    darkPurple: "#1a0b2e",
    backgroundTransparent: "rgba(10, 10, 15, 0.98)",
    chatMessageBackground: "rgba(5, 5, 8, 0.98)",
  },
  light: {
    background: "#ffffff",
    backgroundDarker: "#f5f5f5",
    text: "#1a1a1a",
    textSecondary: "rgba(26, 26, 26, 0.8)",
    darkPurple: "#f0e6ff",
    backgroundTransparent: "rgba(255, 255, 255, 0.98)",
    chatMessageBackground: "rgba(245, 245, 245, 0.98)",
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
