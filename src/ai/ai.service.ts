import { BadRequestException, BadGatewayException, Injectable } from '@nestjs/common';
import { AuthUser } from '@/auth/types/auth-user.type';
import { ArticleService } from '@/article/article.service';
import { getErrorMessage } from '@/common/utils/error-details';
import { GeminiService } from './providers/gemini.service';
import { TranslateArticleResponseDto } from './dto/translate-article.response.dto';
import { AiCacheService } from './cache/ai-cache.service';
import { AiRequestLogService } from './tracking/ai-request-log.service';

type CachedTranslation = {
  translatedText: string;
  detectedLanguage: string;
};

@Injectable()
export class AiService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly articleService: ArticleService,
    private readonly aiCacheService: AiCacheService,
    private readonly aiRequestLogService: AiRequestLogService,
  ) {}

  private buildTranslateArticleCacheKey(
    articleId: string,
    articleUpdatedAt: number,
    targetLanguage: string,
    sourceLanguage?: string,
  ): string {
    return [
      'ai',
      'article',
      'translate',
      articleId,
      articleUpdatedAt,
      targetLanguage,
      sourceLanguage ?? 'auto',
    ].join(':');
  }

  async translateArticle(
    id: string,
    targetLanguage: string,
    sourceLanguage: string | undefined,
    actor: AuthUser,
  ): Promise<TranslateArticleResponseDto> {
    const startedAt = Date.now();
    const article = await this.articleService.findOne(id);
    if (!article.content.trim()) {
      throw new BadRequestException('Article content is empty');
    }

    const cacheKey = this.buildTranslateArticleCacheKey(
      article.id,
      article.updatedAt,
      targetLanguage,
      sourceLanguage,
    );
    const cached = this.aiCacheService.get<CachedTranslation>(cacheKey);
    if (cached) {
      const result = {
        articleId: article.id,
        translatedText: cached.translatedText,
        detectedLanguage: cached.detectedLanguage,
        cacheHit: true,
      };
      this.aiRequestLogService.logTranslateRequest({
        operation: 'translate_article',
        userId: actor.userId,
        login: actor.login,
        role: actor.role,
        articleId: article.id,
        targetLanguage,
        sourceLanguage,
        cacheHit: true,
        ok: true,
        durationMs: Date.now() - startedAt,
      });
      return result;
    }

    try {
      const translated = await this.geminiService.translateText(
        article.content,
        targetLanguage,
        sourceLanguage,
      );
      const detectedLanguage = sourceLanguage ?? translated.detectedLanguage;
      if (!detectedLanguage) {
        throw new BadGatewayException('AI provider did not return detected language');
      }
      this.aiCacheService.set(cacheKey, {
        translatedText: translated.translatedText,
        detectedLanguage: detectedLanguage,
      });
      const result = {
        articleId: article.id,
        translatedText: translated.translatedText,
        detectedLanguage: detectedLanguage,
        cacheHit: false,
      };
      this.aiRequestLogService.logTranslateRequest({
        operation: 'translate_article',
        userId: actor.userId,
        login: actor.login,
        role: actor.role,
        articleId: article.id,
        targetLanguage,
        sourceLanguage,
        cacheHit: false,
        ok: true,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      this.aiRequestLogService.logTranslateRequest({
        operation: 'translate_article',
        userId: actor.userId,
        login: actor.login,
        role: actor.role,
        articleId: article.id,
        targetLanguage,
        sourceLanguage,
        cacheHit: false,
        ok: false,
        durationMs: Date.now() - startedAt,
        errorMessage: getErrorMessage(error),
      });
      throw error;
    }
  }
}
