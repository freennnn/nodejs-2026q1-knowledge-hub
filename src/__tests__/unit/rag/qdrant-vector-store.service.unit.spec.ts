import { ServiceUnavailableException } from '@nestjs/common';
import type { QdrantClient } from '@qdrant/js-client-rest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RagEnv } from '@/rag/rag-env';
import { QdrantVectorStoreService } from '@/rag/vector-store/qdrant-vector-store.service';
import { TEXT_EMBEDDING_004_VECTOR_SIZE } from '@/rag/vector-store/vector-store.types';
import { ArticleStatus } from '@/common/enums/article-status.enum';

function testEnv(overrides: Partial<RagEnv> = {}): RagEnv {
  return {
    geminiEmbeddingModel: 'text-embedding-004',
    vectorDbProvider: 'qdrant',
    vectorDbUrl: 'http://localhost:6333',
    vectorCollection: 'test_articles',
    chunkSize: 800,
    chunkOverlap: 200,
    chunkLocale: 'en',
    conversationMaxMessages: 20,
    ...overrides,
  };
}

describe('QdrantVectorStoreService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('ensureCollection creates collection when missing', async () => {
    const getCollections = vi.fn().mockResolvedValue({ collections: [] });
    const createCollection = vi.fn().mockResolvedValue(true);
    const client = { getCollections, createCollection } as unknown as QdrantClient;
    const service = new QdrantVectorStoreService(testEnv(), client);

    await service.ensureCollection();

    expect(createCollection).toHaveBeenCalledWith('test_articles', {
      vectors: { size: TEXT_EMBEDDING_004_VECTOR_SIZE, distance: 'Cosine' },
    });
  });

  it('ensureCollection skips create when collection exists', async () => {
    const getCollections = vi.fn().mockResolvedValue({
      collections: [{ name: 'test_articles' }],
    });
    const createCollection = vi.fn();
    const client = { getCollections, createCollection } as unknown as QdrantClient;
    const service = new QdrantVectorStoreService(testEnv(), client);

    await service.ensureCollection();

    expect(createCollection).not.toHaveBeenCalled();
  });

  it('deleteByArticleId returns 0 and does not delete when count is 0', async () => {
    const getCollections = vi.fn().mockResolvedValue({
      collections: [{ name: 'test_articles' }],
    });
    const count = vi.fn().mockResolvedValue({ count: 0 });
    const del = vi.fn();
    const client = {
      getCollections,
      createCollection: vi.fn(),
      count,
      delete: del,
    } as unknown as QdrantClient;
    const service = new QdrantVectorStoreService(testEnv(), client);

    const removed = await service.deleteByArticleId('00000000-0000-4000-8000-000000000001');

    expect(removed).toBe(0);
    expect(del).not.toHaveBeenCalled();
  });

  it('maps Qdrant failures to ServiceUnavailableException', async () => {
    const getCollections = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const client = { getCollections } as unknown as QdrantClient;
    const service = new QdrantVectorStoreService(testEnv(), client);

    await expect(service.ensureCollection()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('search returns hits with parsed payload', async () => {
    const getCollections = vi.fn().mockResolvedValue({
      collections: [{ name: 'test_articles' }],
    });
    const search = vi.fn().mockResolvedValue([
      {
        id: 'p1',
        score: 0.91,
        payload: {
          articleId: '00000000-0000-4000-8000-000000000002',
          articleTitle: 'T',
          chunk: 'hello',
          chunkIndex: 0,
          status: ArticleStatus.PUBLISHED,
          categoryId: null,
          tags: ['news'],
        },
      },
    ]);
    const client = {
      getCollections,
      createCollection: vi.fn(),
      search,
    } as unknown as QdrantClient;
    const service = new QdrantVectorStoreService(testEnv(), client);

    const hits = await service.search([0.1, 0.2], 5, { articleStatus: ArticleStatus.PUBLISHED });

    expect(hits).toHaveLength(1);
    expect(hits[0].pointId).toBe('p1');
    expect(hits[0].score).toBe(0.91);
    expect(hits[0].payload.chunk).toBe('hello');
    expect(search).toHaveBeenCalledWith(
      'test_articles',
      expect.objectContaining({
        vector: [0.1, 0.2],
        limit: 5,
        with_payload: true,
        filter: {
          must: [{ key: 'status', match: { value: ArticleStatus.PUBLISHED } }],
        },
      }),
    );
  });

  it('translates status/category/tags filter into Qdrant must conditions', async () => {
    const getCollections = vi.fn().mockResolvedValue({
      collections: [{ name: 'test_articles' }],
    });
    const search = vi.fn().mockResolvedValue([]);
    const client = {
      getCollections,
      createCollection: vi.fn(),
      search,
    } as unknown as QdrantClient;
    const service = new QdrantVectorStoreService(testEnv(), client);

    await service.search([0.5, 0.4], 3, {
      articleStatus: ArticleStatus.ARCHIVED,
      categoryId: '00000000-0000-4000-8000-000000000777',
      tags: ['housing', 'budget'],
    });

    expect(search).toHaveBeenCalledWith(
      'test_articles',
      expect.objectContaining({
        filter: {
          must: [
            { key: 'status', match: { value: ArticleStatus.ARCHIVED } },
            {
              key: 'categoryId',
              match: { value: '00000000-0000-4000-8000-000000000777' },
            },
            { key: 'tags', match: { value: 'housing' } },
            { key: 'tags', match: { value: 'budget' } },
          ],
        },
      }),
    );
  });
});
