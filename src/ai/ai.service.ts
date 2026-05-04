import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
} from '@nestjs/common';
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

const GEMINI_PROVIDER = 'gemini' as const;

@Injectable()
export class AiService {
  private readonly geminiModel = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

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
        provider: GEMINI_PROVIDER,
        model: this.geminiModel,
        geminiCalled: false,
        cacheHit: true,
        httpStatus: 200,
        ok: true,
        durationMs: Date.now() - startedAt,
        createdAt: new Date().toISOString(),
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
        // provider failed to detect source language
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
        provider: GEMINI_PROVIDER,
        model: this.geminiModel,
        geminiCalled: true,
        cacheHit: false,
        httpStatus: 200,
        ok: true,
        durationMs: Date.now() - startedAt,
        createdAt: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      const httpStatus = error instanceof HttpException ? error.getStatus() : 500;
      this.aiRequestLogService.logTranslateRequest({
        operation: 'translate_article',
        userId: actor.userId,
        login: actor.login,
        role: actor.role,
        articleId: article.id,
        targetLanguage,
        sourceLanguage,
        provider: GEMINI_PROVIDER,
        model: this.geminiModel,
        geminiCalled: true,
        cacheHit: false,
        httpStatus,
        ok: false,
        durationMs: Date.now() - startedAt,
        createdAt: new Date().toISOString(),
        errorMessage: getErrorMessage(error),
      });
      throw error;
    }
  }
}
