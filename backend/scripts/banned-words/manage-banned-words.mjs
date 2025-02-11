import readline from "readline";

const API_URL = "http://localhost:3001/banned-words";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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
  } catch (error) {
    console.error(`❌ Błąd podczas dodawania słowa:`, error.message);
  }
}

async function deleteWord(word) {
  try {
    const response = await fetch(
      `${API_URL}/${encodeURIComponent(word.trim())}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Usunięto słowo: ${word}`);
  } catch (error) {
    console.error(`❌ Błąd podczas usuwania słowa:`, error.message);
  }
}

async function listWords() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const words = await response.json();
    console.log("\n=== LISTA ZABRONIONYCH SŁÓW ===");
    words.forEach((item, index) => {
      console.log(`${index + 1}. ${item.word}`);
    });
    console.log("==============================\n");
  } catch (error) {
    console.error("❌ Błąd podczas pobierania listy:", error.message);
  }
}

function showMenu() {
  console.log("\n=== ZARZĄDZANIE LISTĄ ZABRONIONYCH SŁÓW ===");
  console.log("1. Dodaj słowo");
  console.log("2. Usuń słowo");
  console.log("3. Pokaż listę");
  console.log("4. Wyjście");
  console.log("==========================================\n");
}

async function handleChoice(choice) {
  switch (choice) {
    case "1":
      rl.question("Podaj słowo do dodania: ", async (word) => {
        if (word.trim()) {
          await addWord(word);
        }
        showMenu();
        askForChoice();
      });
      break;
    case "2":
      rl.question("Podaj słowo do usunięcia: ", async (word) => {
        if (word.trim()) {
          await deleteWord(word);
        }
        showMenu();
        askForChoice();
      });
      break;
    case "3":
      await listWords();
      showMenu();
      askForChoice();
      break;
    case "4":
      console.log("Do widzenia!");
      rl.close();
      process.exit(0);
    default:
      console.log("❌ Nieprawidłowy wybór. Spróbuj ponownie.");
      showMenu();
      askForChoice();
  }
}

function askForChoice() {
  rl.question("Wybierz opcję (1-4): ", (choice) => {
    handleChoice(choice);
  });
}

// Start programu
console.log("\nProgram do zarządzania listą zabronionych słów");
console.log("Aby dodać wiele słów na raz, użyj skryptu add-banned-words.mjs");
console.log("Aby usunąć duplikaty, użyj skryptu remove-duplicates.mjs");
showMenu();
askForChoice();
