import { createContext, ReactNode } from "react";

interface ThemeContextType {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export const ThemeProvider = ({
  children,
  theme,
  setTheme,
}: ThemeProviderProps) => {
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
