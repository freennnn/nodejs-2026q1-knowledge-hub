import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
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
import { AiConversationContextService, type ConversationTurn } from './cache/ai-conversation-context.service';
import { AiRequestLogService } from './tracking/ai-request-log.service';
import { AiUsageService } from './tracking/ai-usage.service';

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

type AiTokenUsage = {
  prompt: number;
  candidates: number;
  total: number;
};

type OptionalAiTokenUsage = {
  prompt?: number;
  candidates?: number;
  total?: number;
};

const GEMINI_PROVIDER = 'gemini' as const;
const GENERIC_PROMPT_CONTEXT_LIMIT = 3;

@Injectable()
export class AiService {
  private readonly geminiModel = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  constructor(
    private readonly geminiService: GeminiService,
    private readonly articleService: ArticleService,
    private readonly aiCacheService: AiCacheService,
    private readonly aiConversationContextService: AiConversationContextService,
    private readonly aiRequestLogService: AiRequestLogService,
    private readonly aiUsageService: AiUsageService,
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

  private buildGenericPromptRequestPayloadHash(
    dto: GenericPromptDto,
    sessionId: string,
    conversationHistory: ConversationTurn[],
  ): string {
    const payload = {
      model: this.geminiModel,
      prompt: dto.prompt,
      systemInstruction: dto.systemInstruction ?? null,
      maxOutputTokens: dto.maxOutputTokens ?? null,
      temperature: dto.temperature ?? null,
      sessionId,
      conversationHistory,
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
    tokenUsage: AiTokenUsage,
  ): SummarizeArticleResponseDto {
    return {
      articleId: article.id,
      summary,
      originalLength: article.content.length,
      summaryLength: summary.length,
      cacheHit,
      tokenUsage,
    };
  }

  private buildAnalyzeHttpResult(
    article: Article,
    analysis: string,
    suggestions: string[],
    severity: 'info' | 'warning' | 'error',
    cacheHit: boolean,
    tokenUsage: AiTokenUsage,
  ): AnalyzeArticleResponseDto {
    return {
      articleId: article.id,
      analysis,
      suggestions,
      severity,
      cacheHit,
      tokenUsage,
    };
  }

  private buildTokenUsage(usage?: OptionalAiTokenUsage): AiTokenUsage {
    const prompt = usage?.prompt ?? 0;
    const candidates = usage?.candidates ?? 0;
    return {
      prompt,
      candidates,
      total: prompt + candidates,
    };
  }

  async translateArticle(
    id: string,
    targetLanguage: string,
    sourceLanguage: string | undefined,
    actor: AuthUser,
  ): Promise<TranslateArticleResponseDto> {
    this.aiUsageService.record('translate_article');
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
        tokenUsage: this.buildTokenUsage(),
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
      this.aiUsageService.recordTokens(translated.usage);
      const detectedLanguage = sourceLanguage ?? translated.data.detectedLanguage;
      if (!detectedLanguage) {
        // provider failed to detect source language
        throw new BadGatewayException('AI provider did not return detected language');
      }
      this.aiCacheService.set(cacheKey, {
        translatedText: translated.data.translatedText,
        detectedLanguage: detectedLanguage,
      });
      const result = {
        articleId: article.id,
        translatedText: translated.data.translatedText,
        detectedLanguage: detectedLanguage,
        cacheHit: false,
        tokenUsage: this.buildTokenUsage(translated.usage),
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
    this.aiUsageService.record('summarize_article');
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
      const result = this.buildSummarizeHttpResult(
        article,
        cached.summary,
        true,
        this.buildTokenUsage(),
      );
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
      this.aiUsageService.recordTokens(summarized.usage);
      this.aiCacheService.set(cacheKey, {
        summary: summarized.data.summary,
      });
      const result = this.buildSummarizeHttpResult(
        article,
        summarized.data.summary,
        false,
        this.buildTokenUsage(summarized.usage),
      );
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
    this.aiUsageService.record('generic_prompt');
    const startedAt = Date.now();
    const useCache = dto.useCache !== false;
    const sessionId = dto.sessionId?.trim() || randomUUID();
    const conversationHistory = this.aiConversationContextService
      .getRecentTurns(actor.userId, sessionId)
      .slice(-GENERIC_PROMPT_CONTEXT_LIMIT);
    const promptHash = this.buildGenericPromptRequestPayloadHash(dto, sessionId, conversationHistory);

    if (useCache) {
      const cacheKey = this.buildGenericPromptCacheKey(promptHash);
      const cached = this.aiCacheService.get<CachedGenericPrompt>(cacheKey);
      if (cached) {
        this.aiConversationContextService.appendTurn(actor.userId, sessionId, {
          userPrompt: dto.prompt,
          assistantText: cached.text,
        });
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
        return {
          text: cached.text,
          cacheHit: true,
          tokenUsage: this.buildTokenUsage(),
          sessionId,
        };
      }
    }

    try {
      const generated = await this.geminiService.completeGenericPrompt({
        userPrompt: dto.prompt,
        systemInstruction: dto.systemInstruction,
        maxOutputTokens: dto.maxOutputTokens,
        temperature: dto.temperature,
        conversationHistory,
      });
      this.aiUsageService.recordTokens(generated.usage);
      this.aiConversationContextService.appendTurn(actor.userId, sessionId, {
        userPrompt: dto.prompt,
        assistantText: generated.data.text,
      });

      if (useCache) {
        const cacheKey = this.buildGenericPromptCacheKey(promptHash);
        this.aiCacheService.set(cacheKey, { text: generated.data.text });
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

      return {
        text: generated.data.text,
        cacheHit: false,
        tokenUsage: this.buildTokenUsage(generated.usage),
        sessionId,
      };
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
    this.aiUsageService.record('analyze_article');
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
        this.buildTokenUsage(),
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
      this.aiUsageService.recordTokens(analyzed.usage);
      this.aiCacheService.set(cacheKey, analyzed.data);

      const result = this.buildAnalyzeHttpResult(
        article,
        analyzed.data.analysis,
        analyzed.data.suggestions,
        analyzed.data.severity,
        false,
        this.buildTokenUsage(analyzed.usage),
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

  getUsageSnapshot() {
    return this.aiUsageService.getSnapshot();
  }
}
