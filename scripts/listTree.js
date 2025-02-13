const fs = require("fs");
const path = require("path");

// Lista katalogów do pominięcia – dodaj tu te, które nie chcesz widzieć w wyniku
const skipFolders = [
  "node_modules",
  ".git",
  "backup",
  "bower_components",
  "dist",
  "build",
  ".vscode",
];

/**
 * Funkcja generująca strukturę drzewa katalogów jako string.
 * @param {string} dir - katalog startowy
 * @param {string} prefix - prefiks dla formatowania (drzewo)
 * @returns {string} - wynikowy string z drzewem katalogów
 */
function generateTree(dir, prefix = "") {
  let treeStr = "";

  // Jeśli bieżący katalog znajduje się na liście pomijanych, zwracamy pusty string
  if (skipFolders.includes(path.basename(dir))) {
    return treeStr;
  }

  let items;
  try {
    items = fs.readdirSync(dir);
  } catch (err) {
    return treeStr;
  }

  // Filtrujemy wpisy, które mają być pominięte
  items = items.filter((item) => !skipFolders.includes(item));

  items.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const isLast = index === items.length - 1;
    const pointer = isLast ? "└── " : "├── ";
    treeStr += prefix + pointer + item + "\n";

    if (fs.statSync(fullPath).isDirectory()) {
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      treeStr += generateTree(fullPath, newPrefix);
    }
  });
  return treeStr;
}

// Generujemy strukturę drzewa zaczynając od bieżącego katalogu roboczego
const treeOutput = generateTree(process.cwd());

// Upewniamy się, że katalog backup istnieje – jeśli nie, tworzymy go
const backupDir = path.join(process.cwd(), "backup");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Funkcja pomocnicza do dodawania zer wiodących
const pad = (num) => String(num).padStart(2, "0");

// Generowanie znacznika czasu w formacie YYYY-MM-DD_HH-MM-SS
const now = new Date();
const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
  now.getDate()
)}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

// Tworzymy nazwę pliku, np. listTree_2025-02-07_13-19-22.txt
const fileName = `listTree_${timestamp}.txt`;
const filePath = path.join(backupDir, fileName);

// Zapisujemy wynik do pliku
fs.writeFileSync(filePath, treeOutput, "utf8");
console.log(`Struktura projektu została zapisana do pliku: ${filePath}`);
