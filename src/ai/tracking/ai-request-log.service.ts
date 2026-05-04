import { Injectable, Logger } from '@nestjs/common';

export type AiTranslateRequestLog = {
  operation: 'translate_article';
  userId: string;
  login: string;
  role: string;
  articleId: string;
  targetLanguage: string;
  sourceLanguage?: string;
  cacheHit: boolean;
  ok: boolean;
  durationMs: number;
  errorMessage?: string;
};

@Injectable()
export class AiRequestLogService {
  private readonly logger = new Logger(AiRequestLogService.name);

  logTranslateRequest(entry: AiTranslateRequestLog): void {
    this.logger.log('AI translate request', entry);
  }
}
