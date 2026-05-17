import { Module } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { AiRateLimitGuard } from '@/ai/guards/ai-rate-limit.guard';
import { GeminiModule } from '@/ai/gemini.module';
import { PersistenceModule } from '@/persistence/persistence.module';
import { RagConversationService } from '@/rag/conversation/rag-conversation.service';
import { RagArticleIndexService } from '@/rag/rag-article-index.service';
import { RagChatService } from '@/rag/rag-chat.service';
import { RagController } from '@/rag/rag.controller';
import { loadRagEnv, type RagEnv } from '@/rag/rag-env';
import { RagSearchService } from '@/rag/rag-search.service';
import { QDRANT_CLIENT, RAG_ENV } from '@/rag/rag.tokens';
import { QdrantVectorStoreService } from '@/rag/vector-store/qdrant-vector-store.service';

@Module({
  imports: [GeminiModule, PersistenceModule],
  controllers: [RagController],
  providers: [
    {
      provide: RAG_ENV,
      useFactory: (): RagEnv => loadRagEnv(),
    },
    {
      provide: QDRANT_CLIENT,
      inject: [RAG_ENV],
      useFactory: (env: RagEnv): QdrantClient => new QdrantClient({ url: env.vectorDbUrl }),
    },
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
