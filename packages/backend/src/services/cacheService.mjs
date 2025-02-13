export class CacheService {
  constructor(redisClient) {
    this.redisClient = redisClient;
    this.QUESTION_KEY_PREFIX = "q:";
  }

  async clearCacheByStrategy(strategy = "expired", temperature) {
    try {
      let clearedKeys = 0;

      switch (strategy) {
        case "all":
          clearedKeys = await this.clearAllCache();
          break;

        case "temperature":
          if (temperature === undefined) {
            throw new Error(
              "Parametr temperature jest wymagany dla strategii temperature"
            );
          }
          clearedKeys = await this.clearCacheByTemperature(temperature);
          break;

        case "expired":
          clearedKeys = await this.clearExpiredCache();
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

  async clearAllCache() {
    const allKeys = await this.redisClient.keys(`${this.QUESTION_KEY_PREFIX}*`);
    if (allKeys.length > 0) {
      await this.redisClient.del(...allKeys);
    }
    return allKeys.length;
  }

  async clearCacheByTemperature(temperature) {
    const tempKeys = await this.redisClient.keys(
      `${this.QUESTION_KEY_PREFIX}*_temp_${temperature}`
    );
    if (tempKeys.length > 0) {
      await this.redisClient.del(...tempKeys);
    }
    return tempKeys.length;
  }

  async clearExpiredCache() {
    let clearedKeys = 0;
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
    return clearedKeys;
  }

  async cleanupOldData() {
    try {
      console.log("[Redis]: Rozpoczynam czyszczenie starych danych...");

      const clearedKeys = await this.clearAllCache();

      if (clearedKeys === 0) {
        console.log("[Redis]: Brak starych danych do wyczyszczenia");
      } else {
        console.log(
          `[Redis]: Wyczyszczono ${clearedKeys} starych kluczy cache`
        );
      }

      return {
        message: "Stare dane zostały wyczyszczone",
        clearedKeys,
      };
    } catch (error) {
      console.error("[Redis]: Błąd podczas czyszczenia danych:", error);
      throw error;
    }
  }
}
