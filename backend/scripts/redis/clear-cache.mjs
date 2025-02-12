import "dotenv/config";
import { createClient } from "redis";

const QUESTION_KEY_PREFIX = "q:";
const STATS_KEY_PREFIX = "stats:";
const STATS_SORTED_SET = "question_stats";

async function clearCache() {
  console.log("[Redis]: Rozpoczynam czyszczenie cache chatbota...");

  const redisClient = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
  });

  redisClient.on("error", (err) =>
    console.error("[Redis]: Błąd połączenia:", err)
  );

  try {
    await redisClient.connect();
    console.log("[Redis]: Połączono z Redis");

    // Pobierz wszystkie klucze
    const allKeys = await redisClient.keys("*");
    console.log(`[Redis]: Znaleziono ${allKeys.length} kluczy w bazie`);

    // Filtruj tylko klucze związane z pytaniami i odpowiedziami
    const cacheKeys = allKeys.filter((key) =>
      key.startsWith(QUESTION_KEY_PREFIX)
    );

    if (cacheKeys.length > 0) {
      // Usuń każdy klucz osobno i licz usunięte
      let deletedCount = 0;
      for (const key of cacheKeys) {
        await redisClient.del(key);
        deletedCount++;
      }
      console.log(
        `[Redis]: Wyczyszczono ${deletedCount} kluczy cache odpowiedzi`
      );
      console.log(
        "[Redis]: Zachowano pozostałe dane (banned words, statystyki, itp.)"
      );
    } else {
      console.log("[Redis]: Brak kluczy cache do wyczyszczenia");
    }

    console.log("[Redis]: Czyszczenie cache zakończone pomyślnie");
  } catch (error) {
    console.error("[Redis]: Błąd podczas czyszczenia cache:", error);
    process.exit(1);
  } finally {
    await redisClient.quit();
  }

  process.exit(0);
}

clearCache();
