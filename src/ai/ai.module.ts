import { Module } from '@nestjs/common';
import { ArticleModule } from '@/article/article.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiModule } from './gemini.module';
import { AiCacheService } from './cache/ai-cache.service';
import { AiRequestLogService } from './tracking/ai-request-log.service';
import { AiUsageService } from './tracking/ai-usage.service';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { AiConversationContextService } from './cache/ai-conversation-context.service';

@Module({
  imports: [GeminiModule, ArticleModule],
  controllers: [AiController],
  providers: [
    AiService,
    AiCacheService,
    AiConversationContextService,
    AiRequestLogService,
    AiUsageService,
    AiRateLimitGuard,
  ],
})
export class AiModule {}
