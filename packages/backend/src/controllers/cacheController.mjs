export class CacheController {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.QUESTION_KEY_PREFIX = "q:";
  }

  async clearCache(strategy = "expired", temperature) {
    try {
      let clearedKeys = 0;

      switch (strategy) {
        case "all":
          const allKeys = await this.redisClient.keys(
            `${this.QUESTION_KEY_PREFIX}*`
          );
          if (allKeys.length > 0) {
            await this.redisClient.del(...allKeys);
            clearedKeys = allKeys.length;
          }
          break;

        case "temperature":
          if (temperature === undefined) {
            throw new Error(
              "Parametr temperature jest wymagany dla strategii temperature"
            );
          }
          const tempKeys = await this.redisClient.keys(
            `${this.QUESTION_KEY_PREFIX}*_temp_${temperature}`
          );
          if (tempKeys.length > 0) {
            await this.redisClient.del(...tempKeys);
            clearedKeys = tempKeys.length;
          }
          break;

        case "expired":
          const allCacheKeys = await this.redisClient.keys(
            `${this.QUESTION_KEY_PREFIX}*`
          );
          for (const key of allCacheKeys) {
            const ttl = await this.redisClient.ttl(key);
            if (ttl <= 0) {
              await this.redisClient.del(key);
              clearedKeys++;
            }
          }
          break;

        default:
          throw new Error("Nieprawidłowa strategia czyszczenia");
      }

      console.log(
        `[Cache]: Wyczyszczono ${clearedKeys} kluczy cache (strategia: ${strategy})`
      );

      return {
        message: "Cache został wyczyszczony",
        strategy,
        clearedKeys,
      };
    } catch (error) {
      console.error("[Cache]: Błąd podczas czyszczenia cache:", error);
      throw error;
    }
  }

  async cleanupOldData() {
    try {
      console.log("[Redis]: Rozpoczynam czyszczenie starych danych...");

      // Czyszczenie kluczy cache
      const cacheKeys = await this.redisClient.keys(
        `${this.QUESTION_KEY_PREFIX}*`
      );
      if (cacheKeys.length > 0) {
        await this.redisClient.del(...cacheKeys);
        console.log(
          `[Redis]: Wyczyszczono ${cacheKeys.length} starych kluczy cache`
        );
      }

      if (cacheKeys.length === 0) {
        console.log("[Redis]: Brak starych danych do wyczyszczenia");
      }

      return {
        message: "Stare dane zostały wyczyszczone",
        clearedKeys: cacheKeys.length,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas czyszczenia danych:", error);
      throw error;
    }
  }
}
