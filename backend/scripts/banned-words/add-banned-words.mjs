import fs from "fs/promises";
import readline from "readline";
import path from "path";

const API_URL = "http://localhost:3001/banned-words";

async function addWord(word, retries = 3, attempt = 1) {
  const trimmedWord = word.trim();
  try {
    console.log(`\n[Próba ${attempt}/3] Dodawanie słowa: ${trimmedWord}`);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: trimmedWord }),
    });

    if (response.status === 429 && retries > 0) {
      console.log(`⏳ [${trimmedWord}] Limit przekroczony, czekam 5 sekund...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return addWord(trimmedWord, retries - 1, attempt + 1);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ [${trimmedWord}] Dodano pomyślnie!`);
    return true;
  } catch (error) {
    if (error.message.includes("429") && retries > 0) {
      console.log(`⏳ [${trimmedWord}] Limit przekroczony, czekam 5 sekund...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return addWord(trimmedWord, retries - 1, attempt + 1);
    }
    console.error(`❌ [${trimmedWord}] Błąd:`, error.message);
    return false;
  }
}

async function processFile(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const words = fileContent.split("\n").filter((word) => word.trim() !== "");

    console.log(`\n=== ROZPOCZYNAM DODAWANIE ===`);
    console.log(`Znaleziono ${words.length} słów do dodania`);
    console.log(`===============================\n`);

    let successCount = 0;
    let failCount = 0;

    for (const word of words) {
      const success = await addWord(word);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      // Zwiększ opóźnienie między requestami do 2 sekund
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log("\n=== PODSUMOWANIE ===");
    console.log(`✅ Pomyślnie dodano: ${successCount} słów`);
    console.log(`❌ Błędy: ${failCount} słów`);
    console.log("==================\n");
  } catch (error) {
    console.error("Błąd podczas przetwarzania pliku:", error.message);
  }
}

// Sprawdź czy podano argument z nazwą pliku
const filePath = process.argv[2];
if (!filePath) {
  console.error("Proszę podać ścieżkę do pliku ze słowami.");
  console.log("Użycie: node scripts/add-banned-words.mjs data/nazwa-pliku.txt");
  console.log(
    "Przykład: node scripts/add-banned-words.mjs data/example-banned-words.txt"
  );
  process.exit(1);
}

// Konwertuj ścieżkę względną na bezwzględną
const absolutePath = path.resolve(process.cwd(), filePath);
console.log(`\nRozpoczynam przetwarzanie pliku: ${absolutePath}\n`);
processFile(absolutePath);
