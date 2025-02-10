import { useState, useCallback } from "react";

interface UseImageLoadResult {
  isLoading: boolean;
  error: string | null;
  handleImageLoad: () => void;
  handleImageError: () => void;
}

export const useImageLoad = (): UseImageLoadResult => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setError("Nie udało się załadować obrazu");
  }, []);

  return {
    isLoading,
    error,
    handleImageLoad,
    handleImageError,
  };
};
