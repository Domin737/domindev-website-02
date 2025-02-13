export class ModerationController {
  constructor(moderationService) {
    this.moderationService = moderationService;
  }

  async getBannedWords(req, res, next) {
    try {
      const words = await this.moderationService.getBannedWords();
      res.json(words.map((word) => ({ word })));
    } catch (error) {
      next(error);
    }
  }

  async addBannedWord(req, res, next) {
    try {
      const { word } = req.body;
      const result = await this.moderationService.addBannedWord(word);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async removeBannedWord(req, res, next) {
    try {
      const { word } = req.params;
      const result = await this.moderationService.removeBannedWord(word);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async checkContent(req, res, next) {
    try {
      const { text } = req.body;
      const result = await this.moderationService.containsBannedWords(text);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Metoda pomocnicza używana przez inne kontrolery
  async isContentAppropriate(text) {
    return this.moderationService.isContentAppropriate(text);
  }
}
