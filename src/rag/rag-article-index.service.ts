import { Injectable } from '@nestjs/common';
import { GeminiService } from '@/ai/providers/gemini.service';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import type { Article } from '@/common/types/article';
import { buildArticleContentHash } from '@/rag/chunking/build-article-content-hash';
import { chunkArticleText } from '@/rag/chunking/chunk-article-text';
import { loadRagEnv, type RagEnv } from '@/rag/rag-env';
import { QdrantVectorStoreService } from '@/rag/vector-store/qdrant-vector-store.service';
import type { RagVectorPoint } from '@/rag/vector-store/vector-store.types';

@Injectable()
export class RagArticleIndexService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly vectorStore: QdrantVectorStoreService,
    private readonly env: RagEnv = loadRagEnv(),
  ) {}

  async syncArticle(article: Article): Promise<void> {
    // only published articles should be part of the index/semantic search
    if (article.status !== ArticleStatus.PUBLISHED) {
      await this.vectorStore.deleteByArticleId(article.id);
      return;
    }

    const chunks = chunkArticleText(
      article.content,
      this.env.chunkSize,
      this.env.chunkOverlap,
      this.env.chunkLocale,
    );

    await this.vectorStore.deleteByArticleId(article.id);

    if (chunks.length === 0) {
      return;
    }

    const embeddings = await this.geminiService.embedTexts(chunks);
    const updatedAtIso = new Date(article.updatedAt).toISOString();
    const contentHash = buildArticleContentHash(article);

    const points: RagVectorPoint[] = chunks.map((chunk, chunkIndex) => ({
      id: `${article.id}:${chunkIndex}`,
      vector: embeddings[chunkIndex],
      payload: {
        articleId: article.id,
        articleTitle: article.title,
        chunk,
        chunkIndex,
        status: article.status,
        categoryId: article.categoryId,
        tags: article.tags,
        contentHash,
        sourceUpdatedAt: updatedAtIso,
      },
    }));

    await this.vectorStore.upsertPoints(points);
  }

  async removeArticleVectors(articleId: string): Promise<void> {
    await this.vectorStore.deleteByArticleId(articleId);
  }
}
