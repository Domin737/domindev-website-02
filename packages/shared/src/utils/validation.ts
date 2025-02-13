/**
 * Sprawdza, czy tekst nie przekracza maksymalnej długości
 */
export const validateMessageLength = (
  text: string,
  maxLength: number = 1000
): boolean => {
  return text.length <= maxLength;
};

/**
 * Normalizuje tekst pytania (usuwa nadmiarowe spacje, zamienia na małe litery, normalizuje znaki)
 */
export const normalizeQuestion = (question: string): string => {
  return question
    .normalize("NFC") // Normalizuje znaki diakrytyczne
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

/**
 * Szacuje liczbę tokenów w tekście (przybliżona metoda)
 */
export const estimateTokenCount = (text: string): number => {
  return Math.ceil(text.length / 4);
};
