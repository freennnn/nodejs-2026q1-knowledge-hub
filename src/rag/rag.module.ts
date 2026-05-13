import { Module } from '@nestjs/common';
import { QdrantVectorStoreService } from '@/rag/vector-store/qdrant-vector-store.service';

@Module({
  providers: [QdrantVectorStoreService],
  exports: [QdrantVectorStoreService],
})
export class RagModule {}
