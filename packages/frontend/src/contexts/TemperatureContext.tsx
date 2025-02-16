import { createContext, useContext, useState, useRef, ReactNode } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

interface TemperatureContextType {
  temperature: number;
  setTemperature: (temp: number) => void;
  updateTemperature: (temp: number) => Promise<void>;
  onTemperatureChange: () => void;
  addTemperatureListener: (listener: () => void) => () => void;
}

const TemperatureContext = createContext<TemperatureContextType | undefined>(
  undefined
);

const validateTemperature = (temp: number): number => {
  if (temp < 0) return 0;
  if (temp > 1) return 1;
  return temp;
};

export const TemperatureProvider = ({ children }: { children: ReactNode }) => {
  const [temperature, setTemperature] = useState(0.5);
  const listenersRef = useRef<Array<() => void>>([]);

  const handleTemperatureChange = () => {
    // Wywołaj wszystkich słuchaczy
    listenersRef.current.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error("Błąd podczas wywoływania listenera:", error);
      }
    });
  };

  const updateTemperature = async (temp: number) => {
    try {
      const validTemp = validateTemperature(temp);
      await axios.put(`${API_URL}/api/chat/config`, { temperature: validTemp });
      setTemperature(validTemp);
      // Wywołaj handleTemperatureChange po zaktualizowaniu stanu
      setTimeout(handleTemperatureChange, 0);
    } catch (error) {
      console.error("Błąd podczas aktualizacji temperatury:", error);
      throw error;
    }
  };

  const addTemperatureListener = (listener: () => void) => {
    listenersRef.current.push(listener);
    return () => {
      const index = listenersRef.current.indexOf(listener);
      if (index > -1) {
        listenersRef.current.splice(index, 1);
      }
    };
  };

  const safeSetTemperature = (temp: number) => {
    setTemperature(validateTemperature(temp));
  };

  return (
    <TemperatureContext.Provider
      value={{
        temperature,
        setTemperature: safeSetTemperature,
        updateTemperature,
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
