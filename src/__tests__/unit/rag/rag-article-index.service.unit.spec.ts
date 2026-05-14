import { ArticleStatus as PrismaArticleStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { GeminiService } from '@/ai/providers/gemini.service';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import type { PrismaService } from '@/persistence/prisma/prisma.service';
import { RagArticleIndexService } from '@/rag/rag-article-index.service';
import type { RagEnv } from '@/rag/rag-env';
import { QdrantVectorStoreService } from '@/rag/vector-store/qdrant-vector-store.service';

const env: RagEnv = {
  geminiEmbeddingModel: 'text-embedding-004',
  vectorDbProvider: 'qdrant',
  vectorDbUrl: 'http://localhost:6333',
  vectorCollection: 'knowledge_hub_articles',
  chunkSize: 80,
  chunkOverlap: 20,
  chunkLocale: 'en',
  conversationMaxMessages: 20,
};

describe('RagArticleIndexService', () => {
  it('reindex defaults to all statuses and returns counters', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-000000000001',
        title: 'A',
        content:
          'Sentence one. Sentence two with more context. Sentence three with details. Sentence four.',
        status: PrismaArticleStatus.PUBLISHED,
        authorId: null,
        categoryId: null,
        tags: [{ name: 'news' }],
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-02T00:00:00.000Z'),
      },
    ]);
    const prisma = { article: { findMany } } as unknown as PrismaService;
    const geminiService = { embedTexts: vi.fn().mockResolvedValue([[0.1, 0.2]]) } as unknown as GeminiService;
    const vectorStore = {
      deleteByArticleId: vi.fn().mockResolvedValue(0),
      upsertPoints: vi.fn().mockResolvedValue(undefined),
    } as unknown as QdrantVectorStoreService;

    const service = new RagArticleIndexService(prisma, geminiService, vectorStore, env);
    const result = await service.reindex({});

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: undefined }),
      }),
    );
    expect(result.vectorCollection).toBe('knowledge_hub_articles');
    expect(result.indexedArticles).toBe(1);
    expect(result.indexedChunks).toBeGreaterThan(0);
  });

  it('syncArticle deletes non-published when onlyPublished is true', async () => {
    const prisma = { article: { findMany: vi.fn() } } as unknown as PrismaService;
    const geminiService = { embedTexts: vi.fn() } as unknown as GeminiService;
    const deleteByArticleId = vi.fn().mockResolvedValue(0);
    const vectorStore = {
      deleteByArticleId,
      upsertPoints: vi.fn(),
    } as unknown as QdrantVectorStoreService;

    const service = new RagArticleIndexService(prisma, geminiService, vectorStore, env);
    const indexed = await service.syncArticle(
      {
        id: '00000000-0000-4000-8000-000000000002',
        title: 'Draft',
        content: 'Draft body.',
        status: ArticleStatus.DRAFT,
        authorId: null,
        categoryId: null,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      { onlyPublished: true },
    );

    expect(indexed).toBe(0);
    expect(deleteByArticleId).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000002');
  });
});
