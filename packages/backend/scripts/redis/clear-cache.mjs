import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

async function clearCache() {
  try {
    console.log("[Redis]: Łączenie z Redis...");
    const client = createClient({ url: REDIS_URL });

    client.on("error", (err) => {
      console.error("[Redis]: Błąd połączenia:", err);
      process.exit(1);
    });

    await client.connect();
    console.log("[Redis]: Połączono z Redis");

    // Wyczyść wszystkie klucze kontekstu i cache
    const contextKeys = await client.keys("ctx:*");
    const cacheKeys = await client.keys("q:*");
    const allKeys = [...contextKeys, ...cacheKeys];

    if (allKeys.length === 0) {
      console.log("[Redis]: Brak kluczy do wyczyszczenia");
      await client.quit();
      return;
    }

    console.log("[Redis]: Znalezione klucze:", allKeys);
    await client.del(allKeys);
    console.log(`[Redis]: Wyczyszczono ${allKeys.length} kluczy`);

    await client.quit();
    console.log("[Redis]: Rozłączono z Redis");
  } catch (error) {
    console.error("[Redis]: Błąd podczas czyszczenia cache:", error);
    process.exit(1);
  }
}

clearCache();
