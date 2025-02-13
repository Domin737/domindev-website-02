const fs = require("fs").promises;
const path = require("path");

// Ustal katalog główny projektu jako rodzic katalogu "scripts"
const projectRoot = path.resolve(__dirname, "..");

// Lista katalogów i plików, które zawsze powinny być pomijane
const ALWAYS_IGNORE = [
  ".git", // pomijamy cały katalog .git
  "node_modules", // pomijamy katalog node_modules
  ".gitignore", // pomijamy plik .gitignore
  ".DS_Store",
  "Thumbs.db",
  "backup", // pomijamy folder backup (bez względu na to, gdzie się znajduje)
  "backup.js", // pomijamy skrypt backup.js
];

// Lista rozszerzeń plików binarnych, które powinny być pomijane
const BINARY_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".ico",
  ".pdf",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".zip",
  ".tar",
  ".gz",
  ".7z",
  ".rar",
  ".bin",
  ".dat",
];

// Funkcja odczytująca i parsująca .gitignore z katalogu głównego
async function readGitignore() {
  try {
    const content = await fs.readFile(
      path.join(projectRoot, ".gitignore"),
      "utf-8"
    );
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch (error) {
    console.error("Błąd odczytu .gitignore:", error);
    return [];
  }
}

// Funkcja sprawdzająca, czy plik ma rozszerzenie binarne
function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  // Pliki .scss traktujemy jako tekstowe
  if (ext === ".scss") {
    return false;
  }
  return BINARY_EXTENSIONS.includes(ext);
}

/**
 * Funkcja sprawdzająca, czy dany plik lub katalog powinien być pominięty.
 * Dla plików .scss i .svg – jeżeli nie leżą w krytycznych katalogach, nie są ignorowane.
 */
async function shouldIgnore(filePath, ignorePatterns) {
  const ext = path.extname(filePath).toLowerCase();
  // Używamy projectRoot jako bazy do obliczania ścieżki względnej
  const relativePath = path.relative(projectRoot, filePath);
  const segments = relativePath.split(path.sep);

  // Katalogi, których absolutnie nie chcemy przetwarzać
  const forcedIgnoreDirs = [".git", "node_modules", "backup"];

  // Jeśli plik ma rozszerzenie .scss lub .svg, sprawdzamy czy leży w krytycznych katalogach
  if (ext === ".scss" || ext === ".svg") {
    const isInForcedDir = segments.some((segment) =>
      forcedIgnoreDirs.includes(segment)
    );
    if (!isInForcedDir) {
      // Plik .scss lub .svg poza krytycznymi – nie ignorujemy go
      return false;
    }
  }

  // Jeżeli którakolwiek część ścieżki znajduje się w ALWAYS_IGNORE, pomijamy plik/katalog
  if (segments.some((segment) => ALWAYS_IGNORE.includes(segment))) {
    return true;
  }

  // Sprawdzenie wzorców z .gitignore
  return ignorePatterns.some((pattern) => {
    const cleanPattern = pattern.startsWith("/") ? pattern.slice(1) : pattern;
    if (cleanPattern.includes("*")) {
      // Zamiana glob na wyrażenie regularne
      const regexPattern = cleanPattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*");
      const regex = new RegExp(regexPattern);
      return regex.test(relativePath) || regex.test(path.basename(filePath));
    }
    return (
      relativePath === cleanPattern ||
      relativePath.startsWith(cleanPattern + path.sep) ||
      relativePath.endsWith(path.sep + cleanPattern)
    );
  });
}

// Funkcja rekurencyjnie odczytująca pliki (pomijając ignorowane katalogi/pliki)
// Obliczamy ścieżki względne względem projectRoot
async function readFilesRecursively(dir, ignorePatterns) {
  const results = [];
  let files;
  try {
    files = await fs.readdir(dir);
  } catch (error) {
    console.error(`Błąd odczytu katalogu ${dir}:`, error);
    return results;
  }

  for (const file of files.sort()) {
    const filePath = path.join(dir, file);
    if (await shouldIgnore(filePath, ignorePatterns)) {
      continue;
    }

    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch (error) {
      console.error(`Błąd pobierania statystyk pliku ${filePath}:`, error);
      continue;
    }

    if (stat.isDirectory()) {
      const subResults = await readFilesRecursively(filePath, ignorePatterns);
      results.push(...subResults);
    } else {
      // Pomijamy pliki binarne
      if (isBinaryFile(filePath)) {
        console.log(
          `Pomijanie pliku binarnego: ${path.relative(projectRoot, filePath)}`
        );
        continue;
      }
      try {
        const content = await fs.readFile(filePath, "utf-8");
        results.push({
          path: path.relative(projectRoot, filePath),
          content,
        });
      } catch (error) {
        console.error(`Błąd odczytu pliku ${filePath}:`, error);
      }
    }
  }
  return results;
}

// Funkcja analizująca strukturę projektu, budując drzewo katalogów i plików
// Obliczamy ścieżki względne względem projectRoot
async function analyzeProjectStructure(dir, prefix = "", ignorePatterns) {
  let structure = "";
  let items;
  try {
    items = await fs.readdir(dir);
  } catch (error) {
    console.error(`Błąd odczytu katalogu ${dir}:`, error);
    return structure;
  }

  // Filtrujemy i sortujemy elementy
  const filteredItems = [];
  for (const item of items.sort()) {
    const itemPath = path.join(dir, item);
    if (!(await shouldIgnore(itemPath, ignorePatterns))) {
      filteredItems.push(item);
    }
  }

  for (let i = 0; i < filteredItems.length; i++) {
    const item = filteredItems[i];
    const itemPath = path.join(dir, item);
    const isLast = i === filteredItems.length - 1;
    const pointer = isLast ? "└── " : "├── ";

    let stat;
    try {
      stat = await fs.stat(itemPath);
    } catch (error) {
      console.error(`Błąd pobierania statystyk pliku ${itemPath}:`, error);
      continue;
    }

    const isBinary = isBinaryFile(itemPath);
    structure += `${prefix}${pointer}${item}${isBinary ? " (binary)" : ""}\n`;

    if (stat.isDirectory()) {
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      structure += await analyzeProjectStructure(
        itemPath,
        newPrefix,
        ignorePatterns
      );
    }
  }
  return structure;
}

// Główna funkcja tworząca backup
async function createBackup() {
  try {
    // Ustawiamy backupDir jako katalog "backup" w obrębie katalogu "scripts"
    const backupDir = path.join(__dirname, "backup");
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir);
    }

    // Dynamiczne odczytanie zawartości .gitignore (z katalogu głównego)
    const ignorePatterns = await readGitignore();

    // Generowanie nazwy pliku backup na podstawie aktualnej daty i lokalnego czasu
    const now = new Date();
    const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\..+/, "")
      .replace("T", "_");
    const backupFileName = `backup_${localTime}.txt`;
    const backupPath = path.join(backupDir, backupFileName);

    // Przygotowanie zawartości backupu (nagłówek, struktura projektu, zawartość plików)
    const structure = await analyzeProjectStructure(
      projectRoot,
      "",
      ignorePatterns
    );
    let backupContent = [
      `Backup utworzony: ${now.toLocaleString()}`,
      "",
      "Struktura projektu:",
      structure,
      "",
      "Zawartość plików:",
      "",
    ].join("\n");

    // Skanowanie plików do backupu
    console.log("Rozpoczęcie skanowania plików...");
    const files = await readFilesRecursively(projectRoot, ignorePatterns);
    console.log(`Znaleziono ${files.length} plików do backupu.`);

    // Dla każdego pliku dodajemy tylko ścieżkę względną jako nagłówek
    const filesContent = files
      .map((file) => {
        return `// ${file.path}\n${file.content}\n\n`;
      })
      .join("\n");

    backupContent += filesContent;

    // Zapisanie pliku backup
    await fs.writeFile(backupPath, backupContent, "utf-8");
    console.log(`Backup został utworzony: ${backupFileName}`);
  } catch (error) {
    console.error("Błąd podczas tworzenia backupu:", error);
  }
}

// Uruchomienie funkcji tworzącej backup
createBackup();
