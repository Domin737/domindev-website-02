export class CacheController {
  constructor(cacheService) {
    this.cacheService = cacheService;
  }

  async clearCache(req, res) {
    try {
      const { strategy, temperature } = req.query;
      const result = await this.cacheService.clearCacheByStrategy(
        strategy,
        temperature
      );
      res.json(result);
    } catch (error) {
      console.error(
        "[Cache Controller]: Błąd podczas czyszczenia cache:",
        error
      );
      res.status(500).json({
        error: "Wystąpił błąd podczas czyszczenia cache",
        details: error.message,
      });
    }
  }

  async cleanupOldData(req, res) {
    try {
      const result = await this.cacheService.cleanupOldData();
      res.json(result);
    } catch (error) {
      console.error(
        "[Cache Controller]: Błąd podczas czyszczenia starych danych:",
        error
      );
      res.status(500).json({
        error: "Wystąpił błąd podczas czyszczenia starych danych",
        details: error.message,
      });
    }
  }
}
