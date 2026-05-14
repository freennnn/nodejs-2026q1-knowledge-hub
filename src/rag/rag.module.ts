import { Module } from '@nestjs/common';
import { AiRateLimitGuard } from '@/ai/guards/ai-rate-limit.guard';
import { GeminiModule } from '@/ai/gemini.module';
import { PersistenceModule } from '@/persistence/persistence.module';
import { RagConversationService } from '@/rag/conversation/rag-conversation.service';
import { RagArticleIndexService } from '@/rag/rag-article-index.service';
import { RagChatService } from '@/rag/rag-chat.service';
import { RagController } from '@/rag/rag.controller';
import { RagSearchService } from '@/rag/rag-search.service';
import { QdrantVectorStoreService } from '@/rag/vector-store/qdrant-vector-store.service';

@Module({
  imports: [GeminiModule, PersistenceModule],
  controllers: [RagController],
  providers: [
    QdrantVectorStoreService,
    RagArticleIndexService,
    RagSearchService,
    RagConversationService,
    RagChatService,
    AiRateLimitGuard,
  ],
  exports: [
    QdrantVectorStoreService,
    RagArticleIndexService,
    RagSearchService,
    RagConversationService,
    RagChatService,
  ],
})
export class RagModule {}
