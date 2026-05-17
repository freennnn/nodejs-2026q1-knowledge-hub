import { Inject, Injectable } from '@nestjs/common';
import { ArticleStatus as PrismaArticleStatus } from '@prisma/client';
import { v5 as uuidv5 } from 'uuid';
import { GeminiService } from '@/ai/providers/gemini.service';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import type { Article } from '@/common/types/article';
import { PrismaService } from '@/persistence/prisma/prisma.service';
import { buildArticleContentHash } from '@/rag/chunking/build-article-content-hash';
import { chunkArticleText } from '@/rag/chunking/chunk-article-text';
import type { ReindexRequestDto } from '@/rag/dto/reindex-request.dto';
import type { ReindexResponseDto } from '@/rag/dto/reindex-response.dto';
import type { RagEnv } from '@/rag/rag-env';
import { RAG_ENV } from '@/rag/rag.tokens';
import { QdrantVectorStoreService } from '@/rag/vector-store/qdrant-vector-store.service';
import type { RagArticleVectorPoint } from '@/rag/vector-store/vector-store.types';

const prismaToAppArticleStatus = {
  [PrismaArticleStatus.DRAFT]: ArticleStatus.DRAFT,
  [PrismaArticleStatus.PUBLISHED]: ArticleStatus.PUBLISHED,
  [PrismaArticleStatus.ARCHIVED]: ArticleStatus.ARCHIVED,
} as const satisfies Record<PrismaArticleStatus, ArticleStatus>;
const RAG_POINT_ID_NAMESPACE = '7f9f2c7b-2862-4610-b1d2-8e87cc6465ab';

@Injectable()
export class RagArticleIndexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly vectorStore: QdrantVectorStoreService,
    @Inject(RAG_ENV) private readonly env: RagEnv,
  ) {}

  async reindex(dto: ReindexRequestDto): Promise<ReindexResponseDto> {
    const onlyPublished = dto.onlyPublished ?? false;
    const rows = await this.prisma.article.findMany({
      where: {
        id: dto.articleIds?.length ? { in: dto.articleIds } : undefined,
        status: onlyPublished ? PrismaArticleStatus.PUBLISHED : undefined,
      },
      include: { tags: true },
    });

    let indexedArticles = 0;
    let indexedChunks = 0;
    for (const row of rows) {
      const article: Article = {
        id: row.id,
        title: row.title,
        content: row.content,
        status: prismaToAppArticleStatus[row.status],
        authorId: row.authorId,
        categoryId: row.categoryId,
        tags: row.tags.map((t) => t.name),
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
      };
      const chunkCount = await this.syncArticle(article, { onlyPublished });
      if (chunkCount > 0) {
        indexedArticles += 1;
        indexedChunks += chunkCount;
      }
    }

    return {
      indexedArticles,
      indexedChunks,
      vectorCollection: this.env.vectorCollection,
    };
  }

  async syncArticle(
    article: Article,
    options?: { onlyPublished?: boolean },
  ): Promise<number> {
    const onlyPublished = options?.onlyPublished ?? false;
    if (onlyPublished && article.status !== ArticleStatus.PUBLISHED) {
      await this.vectorStore.deleteByArticleId(article.id);
      return 0;
    }

    const chunks = chunkArticleText(
      article.content,
      this.env.chunkSize,
      this.env.chunkOverlap,
      this.env.chunkLocale,
    );

    await this.vectorStore.deleteByArticleId(article.id);

    if (chunks.length === 0) {
      return 0;
    }

    const embeddings = await this.geminiService.embedTexts(chunks);
    const updatedAtIso = new Date(article.updatedAt).toISOString();
    const contentHash = buildArticleContentHash(article);

    const points: RagArticleVectorPoint[] = chunks.map((chunk, chunkIndex) => ({
      id: uuidv5(`${article.id}:${chunkIndex}`, RAG_POINT_ID_NAMESPACE),
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
    return points.length;
  }

  async removeArticleVectors(articleId: string): Promise<number> {
    return this.vectorStore.deleteByArticleId(articleId);
  }
}
