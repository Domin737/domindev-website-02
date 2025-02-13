import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lista katalogów i plików, które zawsze powinny być pomijane
const ALWAYS_IGNORE = [
  ".git", // pomijamy cały katalog .git
  "node_modules", // pomijamy katalog node_modules
  ".gitignore", // pomijamy plik .gitignore
  ".DS_Store",
  "Thumbs.db",
  "backup",
  "backup.js",
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

// Funkcja odczytująca i parsująca .gitignore dynamicznie
async function readGitignore() {
  try {
    const content = await fs.readFile(
      path.join(__dirname, ".gitignore"),
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

// Funkcja sprawdzająca czy plik jest binarny na podstawie rozszerzenia
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
 * Teraz, jeśli plik ma rozszerzenie .scss lub .svg i nie znajduje się w krytycznych katalogach
 * (node_modules, .git, backup), to nie jest ignorowany nawet jeśli pasuje do reguł.
 */
async function shouldIgnore(filePath, ignorePatterns) {
  const ext = path.extname(filePath).toLowerCase();
  const relativePath = path.relative(__dirname, filePath);
  const segments = relativePath.split(path.sep);

  // Definiujemy katalogi, których absolutnie nie chcemy przetwarzać, niezależnie od rozszerzenia
  const forcedIgnoreDirs = [".git", "node_modules", "backup"];

  // Jeśli plik ma rozszerzenie .scss lub .svg, sprawdzamy, czy nie leży w katalogach krytycznych
  if (ext === ".scss" || ext === ".svg") {
    const isInForcedDir = segments.some((segment) =>
      forcedIgnoreDirs.includes(segment)
    );
    if (!isInForcedDir) {
      // Plik .scss lub .svg poza krytycznymi katalogami – nie ignorujemy go
      return false;
    }
    // Jeśli leży w katalogu krytycznym, pozostaje ignorowany.
  }

  // Standardowe sprawdzanie – jeżeli którakolwiek część ścieżki znajduje się w ALWAYS_IGNORE, pomijamy plik/katalog
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
          `Pomijanie pliku binarnego: ${path.relative(__dirname, filePath)}`
        );
        continue;
      }
      try {
        const content = await fs.readFile(filePath, "utf-8");
        results.push({
          path: path.relative(__dirname, filePath),
          content,
        });
      } catch (error) {
        console.error(`Błąd odczytu pliku ${filePath}:`, error);
      }
    }
  }
  return results;
}

// Funkcja analizująca strukturę projektu
async function analyzeProjectStructure(dir, indent = "", ignorePatterns) {
  let structure = "";
  let items;
  try {
    items = await fs.readdir(dir);
  } catch (error) {
    console.error(`Błąd odczytu katalogu ${dir}:`, error);
    return structure;
  }

  for (const item of items.sort()) {
    const itemPath = path.join(dir, item);
    if (await shouldIgnore(itemPath, ignorePatterns)) {
      continue;
    }

    let stat;
    try {
      stat = await fs.stat(itemPath);
    } catch (error) {
      console.error(`Błąd pobierania statystyk pliku ${itemPath}:`, error);
      continue;
    }

    const relativePath = path.relative(__dirname, itemPath);
    if (stat.isDirectory()) {
      structure += `${indent}${relativePath}/\n`;
      structure += await analyzeProjectStructure(
        itemPath,
        indent + "  ",
        ignorePatterns
      );
    } else {
      const isBinary = isBinaryFile(itemPath);
      structure += `${indent}${relativePath}${isBinary ? " (binary)" : ""}\n`;
    }
  }
  return structure;
}

// Funkcja tworząca backup z dynamicznym ładowaniem danych
async function createBackup() {
  try {
    // Utwórz katalog backup, jeśli nie istnieje
    const backupDir = path.join(__dirname, "backup");
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir);
    }

    // Dynamiczne odczytanie zawartości .gitignore (służy tylko do ignorowania plików)
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

    // Przygotowanie zawartości backupu (struktura projektu + nagłówek sekcji plików)
    const structure = await analyzeProjectStructure(
      __dirname,
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
    const files = await readFilesRecursively(__dirname, ignorePatterns);
    console.log(`Znaleziono ${files.length} plików do backupu.`);

    // Dla każdego pliku dodajemy nagłówek z informacjami o pliku (lokalizacja, nazwa, rozszerzenie)
    const filesContent = files
      .map((file) => {
        const fileName = path.basename(file.path);
        const fileExt = path.extname(file.path);
        const fileDir = path.dirname(file.path);
        const header = `// Lokalizacja: ${fileDir}\n// Nazwa pliku: ${fileName}\n// Rozszerzenie: ${fileExt}\n`;
        return `${header}${file.content}\n\n`;
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

// Uruchomienie backupu
createBackup();
