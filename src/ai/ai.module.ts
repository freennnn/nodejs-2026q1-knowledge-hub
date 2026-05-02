import { Module } from '@nestjs/common';
import { ArticleModule } from '@/article/article.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './providers/gemini.service';
import { AiCacheService } from './cache/ai-cache.service';

@Module({
  imports: [ArticleModule],
  controllers: [AiController],
  providers: [AiService, GeminiService, AiCacheService],
})
export class AiModule {}
