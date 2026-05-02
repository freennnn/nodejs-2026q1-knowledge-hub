import { Injectable, BadGatewayException } from '@nestjs/common';
import { ArticleService } from '@/article/article.service';
import { GeminiService } from './providers/gemini.service';
import { TranslateArticleResponseDto } from './dto/translate-article.response.dto';
import { AiCacheService } from './cache/ai-cache.service';

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
    sourceLanguage?: string,
  ): Promise<TranslateArticleResponseDto> {
    const article = await this.articleService.findOne(id);

    const cacheKey = this.buildTranslateArticleCacheKey(
      article.id,
      article.updatedAt,
      targetLanguage,
      sourceLanguage,
    );
    const cached = this.aiCacheService.get<CachedTranslation>(cacheKey);
    if (cached) {
      return {
        articleId: article.id,
        translatedText: cached.translatedText,
        detectedLanguage: cached.detectedLanguage,
        cacheHit: true,
      };
    }

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
    return {
      articleId: article.id,
      translatedText: translated.translatedText,
      detectedLanguage: detectedLanguage,
      cacheHit: false,
    };
  }
}
