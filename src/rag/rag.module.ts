import { Module } from '@nestjs/common';
import { GeminiModule } from '@/ai/gemini.module';
import { RagArticleIndexService } from '@/rag/rag-article-index.service';
import { QdrantVectorStoreService } from '@/rag/vector-store/qdrant-vector-store.service';

@Module({
  imports: [GeminiModule],
  providers: [QdrantVectorStoreService, RagArticleIndexService],
  exports: [QdrantVectorStoreService, RagArticleIndexService],
})
export class RagModule {}
