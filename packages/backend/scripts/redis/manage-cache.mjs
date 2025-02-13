import "dotenv/config";
import { createClient } from "redis";

// Prefiksy kluczy w Redis
const QUESTION_KEY_PREFIX = "q:"; // dla pytań/odpowiedzi chatbota
const BANNED_WORDS_KEY = "banned_words"; // dla zabronionych słów
const STATS_KEY_PREFIX = "stats:"; // dla statystyk
const STATS_SORTED_SET = "question_stats"; // dla rankingu pytań

// Inicjalizacja Redis
const redisClient = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

// Obsługa błędów Redis
redisClient.on("error", (err) =>
  console.log("[Redis]: Redis Client Error", err)
);

const clearCache = async (strategy, temperature) => {
  try {
    await redisClient.connect();
    let clearedKeys = 0;

    switch (strategy) {
      case "all":
        // Wyczyść wszystkie klucze związane z chatem
        const allKeys = await redisClient.keys(`${QUESTION_KEY_PREFIX}*`);
        if (allKeys.length > 0) {
          await redisClient.del(allKeys);
          clearedKeys = allKeys.length;
          console.log(
            `[Cache]: Wyczyszczono wszystkie klucze cache (${clearedKeys})`
          );
        } else {
          console.log("[Cache]: Brak kluczy cache do wyczyszczenia");
        }

        // Wyczyść statystyki
        const statsExists = await redisClient.exists(STATS_SORTED_SET);
        if (statsExists) {
          await redisClient.del(STATS_SORTED_SET);
          console.log("[Cache]: Wyczyszczono statystyki pytań");
        } else {
          console.log("[Cache]: Brak statystyk do wyczyszczenia");
        }
        break;

      case "temperature":
        if (!temperature) {
          console.error("[Cache]: Nie podano temperatury");
          process.exit(1);
        }
        // Klucz już zawiera _temp_, więc na pewno jest to cache chatbota
        const tempKeys = await redisClient.keys(
          `${QUESTION_KEY_PREFIX}*_temp_${temperature}`
        );
        if (tempKeys.length > 0) {
          await redisClient.del(tempKeys);
          clearedKeys = tempKeys.length;
          console.log(
            `[Cache]: Wyczyszczono ${clearedKeys} kluczy dla temperatury ${temperature}`
          );
        } else {
          console.log(
            `[Cache]: Brak kluczy do wyczyszczenia dla temperatury ${temperature}`
          );
        }
        break;

      case "expired":
        const allCacheKeys = await redisClient.keys(`${QUESTION_KEY_PREFIX}*`);
        for (const key of allCacheKeys) {
          const ttl = await redisClient.ttl(key);
          if (ttl <= 0) {
            await redisClient.del(key);
            clearedKeys++;
          }
        }
        console.log(
          clearedKeys > 0
            ? `[Cache]: Wyczyszczono ${clearedKeys} wygasłych kluczy`
            : "[Cache]: Brak wygasłych kluczy do wyczyszczenia"
        );
        break;

      case "stats":
        const statsExist = await redisClient.exists(STATS_SORTED_SET);
        if (statsExist) {
          await redisClient.del(STATS_SORTED_SET);
          console.log("[Cache]: Wyczyszczono statystyki pytań");
        } else {
          console.log("[Cache]: Brak statystyk do wyczyszczenia");
        }
        break;

      default:
        console.error("[Cache]: Nieprawidłowa strategia czyszczenia");
        process.exit(1);
    }
  } catch (error) {
    console.error("[Cache]: Błąd podczas czyszczenia cache:", error);
    process.exit(1);
  } finally {
    await redisClient.quit();
  }
};

const showStats = async () => {
  try {
    await redisClient.connect();

    // Pobierz wszystkie klucze związane z chatem
    const allKeys = await redisClient.keys(`${QUESTION_KEY_PREFIX}*`);

    // Statystyki według temperatury
    const tempStats = new Map();
    for (const key of allKeys) {
      const tempMatch = key.match(/_temp_([\d.]+)$/);
      if (tempMatch) {
        const temp = tempMatch[1];
        tempStats.set(temp, (tempStats.get(temp) || 0) + 1);
      }
    }

    // Wyświetl statystyki cache
    console.log("\n=== STATYSTYKI CACHE ===");
    console.log(`Całkowita liczba wpisów w cache chatbota: ${allKeys.length}`);

    if (tempStats.size > 0) {
      console.log("\nPodział według temperatury:");
      for (const [temp, count] of tempStats.entries()) {
        console.log(`- Temperatura ${temp}: ${count} kluczy`);
      }
    }

    // Sprawdź wygasłe klucze
    let expiredCount = 0;
    for (const key of allKeys) {
      const ttl = await redisClient.ttl(key);
      if (ttl <= 0) expiredCount++;
    }
    console.log(`\nLiczba wygasłych kluczy: ${expiredCount}`);

    // Wyświetl statystyki pytań
    const statsExists = await redisClient.exists(STATS_SORTED_SET);
    if (statsExists) {
      const questions = await redisClient.zRangeWithScores(
        STATS_SORTED_SET,
        0,
        -1,
        {
          REV: true,
        }
      );
      console.log("\n=== STATYSTYKI PYTAŃ ===");
      console.log(`Liczba unikalnych pytań: ${questions.length}`);
      if (questions.length > 0) {
        console.log("\nTop 5 najczęstszych pytań:");
        questions.slice(0, 5).forEach(({ value, score }) => {
          console.log(`- "${value}": ${score} razy`);
        });
      }
    } else {
      console.log("\nBrak statystyk pytań");
    }
  } catch (error) {
    console.error("[Cache]: Błąd podczas pobierania statystyk:", error);
    process.exit(1);
  } finally {
    await redisClient.quit();
  }
};

// Parsowanie argumentów
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "clear":
    const strategy = args[1] || "expired";
    const temperature = args[2];
    clearCache(strategy, temperature);
    break;

  case "stats":
    showStats();
    break;

  default:
    console.log(`
Użycie:
  npm run cache:clear [strategia] [temperatura]
  npm run cache:stats

Strategie czyszczenia:
  - expired (domyślna) - usuwa tylko wygasłe wpisy z cache chatbota
  - all               - usuwa wszystkie wpisy z cache chatbota i statystyki
  - stats            - usuwa tylko statystyki pytań
  - temperature      - usuwa wpisy z cache chatbota dla podanej temperatury (wymagany parametr temperatury)

Przykłady:
  npm run cache:clear                    # usuwa wygasłe wpisy z cache chatbota
  npm run cache:clear:all                # usuwa wszystkie wpisy z cache chatbota i statystyki
  npm run cache:clear:stats              # usuwa tylko statystyki pytań
  npm run cache:clear:temp 0.7           # usuwa wpisy z cache chatbota dla temperatury 0.7
  npm run cache:stats                    # pokazuje statystyki cache chatbota i pytań
    `);
    process.exit(1);
}
