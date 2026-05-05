import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuthUser } from '@/auth/types/auth-user.type';
import { ArticleService } from '@/article/article.service';
import { Article } from '@/common/types/article';
import { getErrorMessage } from '@/common/utils/error-details';
import { GeminiService } from './providers/gemini.service';
import { TranslateArticleResponseDto } from './dto/translate-article.response.dto';
import { SummarizeArticleResponseDto } from './dto/summarize-article.response.dto';
import type { SummarizeMaxLength } from './dto/summarize-max-length';
import { AnalyzeArticleTask, type AnalyzeArticleTask as AnalyzeArticleTaskType } from './dto/analyze-article.dto';
import { AnalyzeArticleResponseDto } from './dto/analyze-article.response.dto';
import { GenericPromptDto } from './dto/generic-prompt.dto';
import { GenericPromptResponseDto } from './dto/generic-prompt.response.dto';
import { AiCacheService } from './cache/ai-cache.service';
import { AiRequestLogService } from './tracking/ai-request-log.service';

type CachedTranslation = {
  translatedText: string;
  detectedLanguage: string;
};

type CachedSummary = {
  summary: string;
};

type CachedGenericPrompt = {
  text: string;
};

type CachedAnalyze = {
  analysis: string;
  suggestions: string[];
  severity: 'info' | 'warning' | 'error';
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

  private buildSummarizeArticleCacheKey(
    articleId: string,
    articleUpdatedAt: number,
    maxLength: SummarizeMaxLength,
    style?: string,
  ): string {
    return [
      'ai',
      'article',
      'summarize',
      articleId,
      articleUpdatedAt,
      maxLength,
      style ?? 'default',
    ].join(':');
  }

  private buildGenericPromptRequestPayloadHash(dto: GenericPromptDto): string {
    const payload = {
      model: this.geminiModel,
      prompt: dto.prompt,
      systemInstruction: dto.systemInstruction ?? null,
      maxOutputTokens: dto.maxOutputTokens ?? null,
      temperature: dto.temperature ?? null,
    };

    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private buildAnalyzeArticleCacheKey(
    articleId: string,
    articleUpdatedAt: number,
    task: AnalyzeArticleTaskType,
  ): string {
    return ['ai', 'article', 'analyze', articleId, articleUpdatedAt, task].join(':');
  }

  private buildGenericPromptCacheKey(promptHash: string): string {
    return ['ai', 'generic-prompt', promptHash].join(':');
  }

  private buildSummarizeHttpResult(
    article: Article,
    summary: string,
    cacheHit: boolean,
  ): SummarizeArticleResponseDto {
    return {
      articleId: article.id,
      summary,
      originalLength: article.content.length,
      summaryLength: summary.length,
      cacheHit,
    };
  }

  private buildAnalyzeHttpResult(
    article: Article,
    analysis: string,
    suggestions: string[],
    severity: 'info' | 'warning' | 'error',
    cacheHit: boolean,
  ): AnalyzeArticleResponseDto {
    return {
      articleId: article.id,
      analysis,
      suggestions,
      severity,
      cacheHit,
    };
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

  async summarizeArticle(
    id: string,
    maxLength: SummarizeMaxLength | undefined,
    style: string | undefined,
    actor: AuthUser,
  ): Promise<SummarizeArticleResponseDto> {
    const startedAt = Date.now();
    const article = await this.articleService.findOne(id);
    if (!article.content.trim()) {
      throw new BadRequestException('Article content is empty');
    }

    const effectiveMaxLength = maxLength ?? 'medium';

    const cacheKey = this.buildSummarizeArticleCacheKey(
      article.id,
      article.updatedAt,
      effectiveMaxLength,
      style,
    );
    const cached = this.aiCacheService.get<CachedSummary>(cacheKey);
    if (cached) {
      const result = this.buildSummarizeHttpResult(article, cached.summary, true);
      this.aiRequestLogService.logSummarizeRequest({
        operation: 'summarize_article',
        userId: actor.userId,
        login: actor.login,
        role: actor.role,
        articleId: article.id,
        maxLength: effectiveMaxLength,
        style,
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
      const summarized = await this.geminiService.summarizeText(
        article.content,
        effectiveMaxLength,
        style,
      );
      this.aiCacheService.set(cacheKey, {
        summary: summarized.summary,
      });
      const result = this.buildSummarizeHttpResult(article, summarized.summary, false);
      this.aiRequestLogService.logSummarizeRequest({
        operation: 'summarize_article',
        userId: actor.userId,
        login: actor.login,
        role: actor.role,
        articleId: article.id,
        maxLength: effectiveMaxLength,
        style,
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
      this.aiRequestLogService.logSummarizeRequest({
        operation: 'summarize_article',
        userId: actor.userId,
        login: actor.login,
        role: actor.role,
        articleId: article.id,
        maxLength: effectiveMaxLength,
        style,
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

  async genericPrompt(dto: GenericPromptDto, actor: AuthUser): Promise<GenericPromptResponseDto> {
    const startedAt = Date.now();
    const useCache = dto.useCache !== false;
    const promptHash = this.buildGenericPromptRequestPayloadHash(dto);

    if (useCache) {
      const cacheKey = this.buildGenericPromptCacheKey(promptHash);
      const cached = this.aiCacheService.get<CachedGenericPrompt>(cacheKey);
      if (cached) {
        this.aiRequestLogService.logGenericPromptRequest({
          operation: 'generic_prompt',
          userId: actor.userId,
          login: actor.login,
          role: actor.role,
          promptHash,
          useCache: true,
          provider: GEMINI_PROVIDER,
          model: this.geminiModel,
          geminiCalled: false,
          cacheHit: true,
          httpStatus: 200,
          ok: true,
          durationMs: Date.now() - startedAt,
          createdAt: new Date().toISOString(),
        });
        return { text: cached.text, cacheHit: true };
      }
    }

    try {
      const generated = await this.geminiService.completeGenericPrompt({
        userPrompt: dto.prompt,
        systemInstruction: dto.systemInstruction,
        maxOutputTokens: dto.maxOutputTokens,
        temperature: dto.temperature,
      });

      if (useCache) {
        const cacheKey = this.buildGenericPromptCacheKey(promptHash);
        this.aiCacheService.set(cacheKey, { text: generated.text });
      }

      this.aiRequestLogService.logGenericPromptRequest({
        operation: 'generic_prompt',
        userId: actor.userId,
        login: actor.login,
        role: actor.role,
        promptHash,
        useCache,
        provider: GEMINI_PROVIDER,
        model: this.geminiModel,
        geminiCalled: true,
        cacheHit: false,
        httpStatus: 200,
        ok: true,
        durationMs: Date.now() - startedAt,
        createdAt: new Date().toISOString(),
      });

      return { text: generated.text, cacheHit: false };
    } catch (error) {
      const httpStatus = error instanceof HttpException ? error.getStatus() : 500;
      this.aiRequestLogService.logGenericPromptRequest({
        operation: 'generic_prompt',
        userId: actor.userId,
        login: actor.login,
        role: actor.role,
        promptHash,
        useCache,
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

  async analyzeArticle(
    id: string,
    task: AnalyzeArticleTaskType | undefined,
    actor: AuthUser,
  ): Promise<AnalyzeArticleResponseDto> {
    const startedAt = Date.now();
    const article = await this.articleService.findOne(id);
    if (!article.content.trim()) {
      throw new BadRequestException('Article content is empty');
    }

    const effectiveTask = task ?? AnalyzeArticleTask.REVIEW;

    const cacheKey = this.buildAnalyzeArticleCacheKey(
      article.id,
      article.updatedAt,
      effectiveTask,
    );
    const cached = this.aiCacheService.get<CachedAnalyze>(cacheKey);
    if (cached) {
      const result = this.buildAnalyzeHttpResult(
        article,
        cached.analysis,
        cached.suggestions,
        cached.severity,
        true,
      );
      this.aiRequestLogService.logAnalyzeRequest({
        operation: 'analyze_article',
        userId: actor.userId,
        login: actor.login,
        role: actor.role,
        articleId: article.id,
        task: effectiveTask,
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
      const analyzed = await this.geminiService.analyzeArticleContent(article.content, effectiveTask);
      this.aiCacheService.set(cacheKey, analyzed);

      const result = this.buildAnalyzeHttpResult(
        article,
        analyzed.analysis,
        analyzed.suggestions,
        analyzed.severity,
        false,
      );
      this.aiRequestLogService.logAnalyzeRequest({
        operation: 'analyze_article',
        userId: actor.userId,
        login: actor.login,
        role: actor.role,
        articleId: article.id,
        task: effectiveTask,
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
      this.aiRequestLogService.logAnalyzeRequest({
        operation: 'analyze_article',
        userId: actor.userId,
        login: actor.login,
        role: actor.role,
        articleId: article.id,
        task: effectiveTask,
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
