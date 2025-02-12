import "dotenv/config";
import { createClient } from "redis";

// Prefiksy kluczy w Redis
const QUESTION_KEY_PREFIX = "q:"; // dla pytań/odpowiedzi chatbota
const BANNED_WORDS_KEY = "banned_words"; // dla zabronionych słów
const STATS_KEY_PREFIX = "stats:"; // dla statystyk
const STATS_SORTED_SET = "question_stats"; // dla rankingu pytań

// Funkcja sprawdzająca czy klucz jest związany z cache chatbota
const isChatbotCacheKey = (key) => {
  return key.startsWith(QUESTION_KEY_PREFIX) && key.includes("_temp_");
};

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
        // Pobierz tylko klucze związane z cache chatbota
        const allKeys = await redisClient.keys(`${QUESTION_KEY_PREFIX}*`);
        const chatbotKeys = allKeys.filter(isChatbotCacheKey);
        if (chatbotKeys.length > 0) {
          await redisClient.del(...chatbotKeys);
          clearedKeys = chatbotKeys.length;
          console.log(
            `[Cache]: Wyczyszczono wszystkie klucze (${clearedKeys})`
          );
        } else {
          console.log("[Cache]: Brak kluczy do wyczyszczenia");
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
          await redisClient.del(...tempKeys);
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
        const chatbotCacheKeys = allCacheKeys.filter(isChatbotCacheKey);
        for (const key of chatbotCacheKeys) {
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

    // Pobierz tylko klucze związane z cache chatbota
    const allKeys = await redisClient.keys(`${QUESTION_KEY_PREFIX}*`);
    const chatbotKeys = allKeys.filter(isChatbotCacheKey);

    // Statystyki według temperatury
    const tempStats = new Map();
    for (const key of allKeys) {
      const tempMatch = key.match(/_temp_([\d.]+)$/);
      if (tempMatch) {
        const temp = tempMatch[1];
        tempStats.set(temp, (tempStats.get(temp) || 0) + 1);
      }
    }

    // Wyświetl statystyki
    console.log("\n=== STATYSTYKI CACHE ===");
    console.log(
      `Całkowita liczba wpisów w cache chatbota: ${chatbotKeys.length}`
    );

    if (tempStats.size > 0) {
      console.log("\nPodział według temperatury:");
      for (const [temp, count] of tempStats.entries()) {
        console.log(`- Temperatura ${temp}: ${count} kluczy`);
      }
    }

    // Sprawdź wygasłe klucze
    let expiredCount = 0;
    for (const key of chatbotKeys) {
      const ttl = await redisClient.ttl(key);
      if (ttl <= 0) expiredCount++;
    }
    console.log(`\nLiczba wygasłych kluczy: ${expiredCount}`);
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
  npm run redisCacheClear [strategia] [temperatura]
  npm run redisCacheStats

Strategie czyszczenia:
  - expired (domyślna) - usuwa tylko wygasłe wpisy z cache chatbota
  - all               - usuwa wszystkie wpisy z cache chatbota
  - temperature      - usuwa wpisy z cache chatbota dla podanej temperatury (wymagany parametr temperatury)

Przykłady:
  npm run redisCacheClear                    # usuwa wygasłe wpisy z cache chatbota
  npm run redisCacheClearAll                 # usuwa wszystkie wpisy z cache chatbota
  npm run redisCacheClearTemp 0.7            # usuwa wpisy z cache chatbota dla temperatury 0.7
  npm run redisCacheStats                    # pokazuje statystyki cache chatbota

UWAGA: Te operacje nie wpływają na inne dane w Redis (zabronione słowa, statystyki, itp.)
    `);
    process.exit(1);
}
