import { createContext, useContext, useState, ReactNode } from "react";

interface TemperatureContextType {
  temperature: number;
  setTemperature: (temp: number) => void;
  onTemperatureChange: () => void;
  addTemperatureListener: (listener: () => void) => () => void;
}

const TemperatureContext = createContext<TemperatureContextType | undefined>(
  undefined
);

export const TemperatureProvider = ({ children }: { children: ReactNode }) => {
  const [temperature, setTemperature] = useState(0.5);
  const [listeners] = useState<Array<() => void>>([]);

  const handleTemperatureChange = () => {
    // Wywołaj wszystkich słuchaczy
    listeners.forEach((listener) => listener());
  };

  const addTemperatureListener = (listener: () => void) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  };

  return (
    <TemperatureContext.Provider
      value={{
        temperature,
        setTemperature,
        onTemperatureChange: handleTemperatureChange,
        addTemperatureListener,
      }}
    >
      {children}
    </TemperatureContext.Provider>
  );
};

export const useTemperature = () => {
  const context = useContext(TemperatureContext);
  if (context === undefined) {
    throw new Error("useTemperature must be used within a TemperatureProvider");
  }
  return context;
};
