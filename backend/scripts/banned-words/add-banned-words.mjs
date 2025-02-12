import fs from "fs/promises";
import path from "path";

const API_URL = "http://localhost:3001/banned-words";
const PAUSE_DURATION = 30 * 60 * 1000; // 30 minut w milisekundach

async function addWord(word, lineNumber, totalLines) {
  const trimmedWord = word.trim();
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      console.log(
        `\n[Wiersz ${lineNumber}/${totalLines}][Próba ${attempts}/${maxAttempts}] Dodawanie słowa: ${trimmedWord}`
      );

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word: trimmedWord }),
      });

      if (response.status === 429) {
        console.log(
          `⏳ [Wiersz ${lineNumber}/${totalLines}][${trimmedWord}] Limit przekroczony, czekam 5 sekund...`
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `✅ [Wiersz ${lineNumber}/${totalLines}][${trimmedWord}] Dodano pomyślnie!`
      );
      return { success: true };
    } catch (error) {
      if (error.message.includes("429")) {
        console.log(
          `⏳ [Wiersz ${lineNumber}/${totalLines}][${trimmedWord}] Limit przekroczony, czekam 5 sekund...`
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      console.error(
        `❌ [Wiersz ${lineNumber}/${totalLines}][${trimmedWord}] Błąd:`,
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  // Jeśli wszystkie próby się nie powiodły
  console.error(
    `❌ [Wiersz ${lineNumber}/${totalLines}][${trimmedWord}] Błąd: Przekroczono limit prób (429)`
  );
  return { success: false, error: "Przekroczono limit prób (429)" };
}

async function saveProgress(filePath, currentIndex) {
  const progressPath = `${filePath}.progress`;
  await fs.writeFile(progressPath, currentIndex.toString());
}

async function loadProgress(filePath) {
  const progressPath = `${filePath}.progress`;
  try {
    const progress = await fs.readFile(progressPath, "utf-8");
    return parseInt(progress, 10);
  } catch {
    return 0;
  }
}

async function processFile(filePath, enablePause = false) {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const words = fileContent.split("\n").filter((word) => word.trim() !== "");

    let startIndex = await loadProgress(filePath);
    const remainingWords = words.length - startIndex;

    console.log(`\n=== ROZPOCZYNAM DODAWANIE ===`);
    console.log(`Pozostało ${remainingWords} słów do dodania`);
    console.log(`Tryb z pauzą: ${enablePause ? "włączony" : "wyłączony"}`);
    console.log(`===============================\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = startIndex; i < words.length; i++) {
      const word = words[i];
      const currentLine = i - startIndex + 1;
      const result = await addWord(word, currentLine, remainingWords);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        // Jeśli napotkano błąd przekroczenia limitu prób, pauzuj i spróbuj ponownie to samo słowo
        if (enablePause && result.error === "Przekroczono limit prób (429)") {
          const currentTime = new Date();
          console.log(
            `\n🔴 [${currentTime.toLocaleTimeString()}] Wykryto 3 nieudane próby dla słowa: ${word}`
          );
          console.log(`Zatrzymuję działanie na 30 minut...`);
          await saveProgress(filePath, i);

          // Pauza 30 minut
          await new Promise((resolve) => setTimeout(resolve, PAUSE_DURATION));

          const resumeTime = new Date();
          console.log(
            `\n🟢 [${resumeTime.toLocaleTimeString()}] Wznawiam działanie...`
          );
          // Cofnij indeks, by ponownie spróbować dodać to samo słowo
          i--;
          continue;
        }
      }

      await saveProgress(filePath, i + 1);
      // Opóźnienie między requestami do 2 sekund
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Usuń plik z postępem po zakończeniu
    const progressPath = `${filePath}.progress`;
    await fs.unlink(progressPath).catch(() => {});

    console.log("\n=== PODSUMOWANIE ===");
    console.log(`✅ Pomyślnie dodano: ${successCount} słów`);
    console.log(`❌ Błędy: ${failCount} słów`);
    console.log("==================\n");
  } catch (error) {
    console.error("Błąd podczas przetwarzania pliku:", error.message);
  }
}

// Sprawdź argumenty
const args = process.argv.slice(2);
const pauseFlag = args.includes("--pause");
const filePath = args.find((arg) => !arg.startsWith("--"));

if (!filePath) {
  console.error("Proszę podać ścieżkę do pliku ze słowami.");
  console.log(
    "Użycie: node scripts/add-banned-words.mjs [--pause] data/nazwa-pliku.txt"
  );
  console.log("Opcje:");
  console.log(
    "  --pause    Włącza 30-minutowe zatrzymanie po 3 nieudanych próbach"
  );
  console.log(
    "\nPrzykład: node scripts/add-banned-words.mjs --pause data/example-banned-words.txt"
  );
  process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), filePath);
console.log(`\nRozpoczynam przetwarzanie pliku: ${absolutePath}`);
console.log(`Tryb z pauzą: ${pauseFlag ? "włączony" : "wyłączony"}\n`);
processFile(absolutePath, pauseFlag);
