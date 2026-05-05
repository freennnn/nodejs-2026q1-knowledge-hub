import { Injectable, Logger } from '@nestjs/common';

export type AiTranslateRequestLog = {
  operation: 'translate_article';
  userId: string;
  login: string;
  role: string;
  articleId: string;
  targetLanguage: string;
  sourceLanguage?: string;
  provider: 'gemini';
  model: string;
  geminiCalled: boolean;
  cacheHit: boolean;
  httpStatus: number;
  ok: boolean;
  durationMs: number;
  createdAt: string;
  errorMessage?: string;
};

export type AiSummarizeRequestLog = {
  operation: 'summarize_article';
  userId: string;
  login: string;
  role: string;
  articleId: string;
  maxLength: 'short' | 'medium' | 'detailed';
  style?: string;
  provider: 'gemini';
  model: string;
  geminiCalled: boolean;
  cacheHit: boolean;
  httpStatus: number;
  ok: boolean;
  durationMs: number;
  createdAt: string;
  errorMessage?: string;
};

export type AiGenericPromptRequestLog = {
  operation: 'generic_prompt';
  userId: string;
  login: string;
  role: string;
  promptHash: string;
  useCache: boolean;
  provider: 'gemini';
  model: string;
  geminiCalled: boolean;
  cacheHit: boolean;
  httpStatus: number;
  ok: boolean;
  durationMs: number;
  createdAt: string;
  errorMessage?: string;
};

@Injectable()
export class AiRequestLogService {
  private readonly logger = new Logger(AiRequestLogService.name);

  logTranslateRequest(entry: AiTranslateRequestLog): void {
    this.logger.log('AI translate request', entry);
  }

  logSummarizeRequest(entry: AiSummarizeRequestLog): void {
    this.logger.log('AI summarize request', entry);
  }

  logGenericPromptRequest(entry: AiGenericPromptRequestLog): void {
    this.logger.log('AI generic prompt request', entry);
  }
}
