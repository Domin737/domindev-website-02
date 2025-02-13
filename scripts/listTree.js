const fs = require("fs");
const path = require("path");

// Lista katalogów do pominięcia – możesz rozszerzyć według potrzeb
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
 * Rekurencyjnie generuje strukturę drzewa katalogów jako string.
 * @param {string} dir - katalog startowy
 * @param {string} prefix - prefiks (do formatowania drzewa)
 * @returns {string} - wynikowy string z drzewem katalogów
 */
function generateTree(dir, prefix = "") {
  let treeStr = "";

  // Jeśli aktualny katalog ma nazwę, którą chcemy pominąć, zwróć pusty string
  if (skipFolders.includes(path.basename(dir))) {
    return treeStr;
  }

  let items;
  try {
    items = fs.readdirSync(dir);
  } catch (err) {
    return treeStr;
  }

  // Filtrujemy elementy, które mają być pominięte
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

// Katalog główny projektu (rodzic katalogu "scripts")
const rootDir = path.resolve(__dirname, "..");

// Generujemy strukturę drzewa zaczynając od katalogu głównego projektu
const treeOutput = generateTree(rootDir);

// Ustawiamy katalog backup, w którym ma być zapisany plik, na "scripts/backup"
const backupDir = path.join(__dirname, "backup");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Pomocnicza funkcja do formatowania czasu
const pad = (num) => String(num).padStart(2, "0");
const now = new Date();
const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
  now.getDate()
)}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

// Nazwa pliku wynikowego
const fileName = `listTree_${timestamp}.txt`;
const filePath = path.join(backupDir, fileName);

// Zapisujemy wynik do pliku
fs.writeFileSync(filePath, treeOutput, "utf8");
console.log(`Struktura projektu została zapisana do pliku: ${filePath}`);
