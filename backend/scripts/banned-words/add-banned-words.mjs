import fs from "fs/promises";
import readline from "readline";
import path from "path";

const API_URL = "http://localhost:3001/banned-words";

async function addWord(word) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ word: word.trim() }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Dodano słowo: ${word}`);
    return true;
  } catch (error) {
    console.error(`❌ Błąd podczas dodawania słowa ${word}:`, error.message);
    return false;
  }
}

async function processFile(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const words = fileContent.split("\n").filter((word) => word.trim() !== "");

    console.log(`\nZnaleziono ${words.length} słów do dodania.\n`);

    let successCount = 0;
    let failCount = 0;

    for (const word of words) {
      const success = await addWord(word);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      // Dodaj małe opóźnienie między requestami
      await new Promise((resolve) => setTimeout(resolve, 100));
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
