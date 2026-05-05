import { Module } from '@nestjs/common';
import { ArticleModule } from '@/article/article.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './providers/gemini.service';
import { AiCacheService } from './cache/ai-cache.service';
import { HttpModule } from '@nestjs/axios';
import { AiRequestLogService } from './tracking/ai-request-log.service';
import { AiUsageService } from './tracking/ai-usage.service';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';

@Module({
  imports: [
    ArticleModule,
    HttpModule.register({
      timeout: 10_000,
      maxRedirects: 3,
    }),
  ],
  controllers: [AiController],
  providers: [AiService, GeminiService, AiCacheService, AiRequestLogService, AiUsageService, AiRateLimitGuard],
})
export class AiModule {}
