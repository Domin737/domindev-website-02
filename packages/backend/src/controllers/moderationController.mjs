import { ChatErrorCode } from "@domindev-website-02/shared/dist/types/chat.js";
import { AppError } from "../middleware/errorHandler.mjs";

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

  // Middleware do moderacji wiadomości
  async moderateMessage(req, res, next) {
    try {
      const { message } = req.body;
      const isAppropriate = await this.moderationService.isContentAppropriate(
        message
      );

      if (!isAppropriate) {
        throw new AppError("Wiadomość zawiera niedozwolone treści", 400, {
          code: ChatErrorCode.MODERATION_FAILED,
        });
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(
          new AppError("Błąd podczas moderacji wiadomości", 500, {
            code: ChatErrorCode.MODERATION_FAILED,
            details: error.message,
          })
        );
      }
    }
  }

  // Metoda pomocnicza używana przez inne kontrolery
  async isContentAppropriate(text) {
    return this.moderationService.isContentAppropriate(text);
  }
}
