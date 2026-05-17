import { describe, expect, it, vi } from 'vitest';
import { GeminiService } from '@/ai/providers/gemini.service';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import { PrismaService } from '@/persistence/prisma/prisma.service';
import { RagSearchService } from '@/rag/rag-search.service';
import { QdrantVectorStoreService } from '@/rag/vector-store/qdrant-vector-store.service';

describe('RagSearchService', () => {
  it('semanticSearch keeps semantic-only retrieval', async () => {
    const embedTexts = vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);
    const search = vi.fn().mockResolvedValue([
      {
        pointId: 'a:0',
        score: 0.95,
        payload: {
          articleId: '00000000-0000-4000-8000-000000000001',
          articleTitle: 'T1',
          chunk: 'semantic hit',
          chunkIndex: 0,
          status: ArticleStatus.PUBLISHED,
          categoryId: null,
          tags: ['news'],
        },
      },
    ]);
    const $queryRaw = vi.fn();
    const geminiService = { embedTexts } as unknown as GeminiService;
    const vectorStore = { search } as unknown as QdrantVectorStoreService;
    const prisma = { $queryRaw } as unknown as PrismaService;

    const service = new RagSearchService(geminiService, vectorStore, prisma);

    const result = await service.semanticSearch('why nest', 5, {
      articleStatus: ArticleStatus.PUBLISHED,
      categoryId: '00000000-0000-4000-8000-000000000099',
      tags: ['news'],
    });

    expect(embedTexts).toHaveBeenCalledWith(['why nest']);
    expect(search).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith([0.1, 0.2, 0.3], 5, {
      articleStatus: ArticleStatus.PUBLISHED,
      categoryId: '00000000-0000-4000-8000-000000000099',
      tags: ['news'],
    });
    expect($queryRaw).not.toHaveBeenCalled();
    expect(result.results).toHaveLength(1);
    expect(result.results[0].chunk).toBe('semantic hit');
  });

  it('hybridSearch merges semantic + lexical candidates', async () => {
    const embedTexts = vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);
    const search = vi
      .fn()
      .mockResolvedValueOnce([
        {
          pointId: 'a:0',
          score: 0.95,
          payload: {
            articleId: '00000000-0000-4000-8000-000000000001',
            articleTitle: 'T1',
            chunk: 'semantic hit',
            chunkIndex: 0,
            status: ArticleStatus.PUBLISHED,
            categoryId: null,
            tags: ['news'],
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          pointId: 'b:0',
          score: 0.8,
          payload: {
            articleId: '00000000-0000-4000-8000-000000000002',
            articleTitle: 'T2',
            chunk: 'lexical-expanded hit',
            chunkIndex: 0,
            status: ArticleStatus.PUBLISHED,
            categoryId: null,
            tags: ['news'],
          },
        },
      ]);
    const $queryRaw = vi.fn().mockResolvedValue([
      { id: '00000000-0000-4000-8000-000000000002' },
      { id: '00000000-0000-4000-8000-000000000001' },
    ]);
    const geminiService = { embedTexts } as unknown as GeminiService;
    const vectorStore = { search } as unknown as QdrantVectorStoreService;
    const prisma = { $queryRaw } as unknown as PrismaService;

    const service = new RagSearchService(geminiService, vectorStore, prisma);

    const result = await service.hybridSearch('why nest', 5, {
      articleStatus: ArticleStatus.PUBLISHED,
      categoryId: '00000000-0000-4000-8000-000000000099',
      tags: ['news'],
    });

    expect(search).toHaveBeenNthCalledWith(1, [0.1, 0.2, 0.3], 10, {
      articleStatus: ArticleStatus.PUBLISHED,
      categoryId: '00000000-0000-4000-8000-000000000099',
      tags: ['news'],
    });
    expect(search).toHaveBeenNthCalledWith(2, [0.1, 0.2, 0.3], 10, {
      articleStatus: ArticleStatus.PUBLISHED,
      categoryId: '00000000-0000-4000-8000-000000000099',
      tags: ['news'],
      articleIds: [
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001',
      ],
    });
    expect($queryRaw).toHaveBeenCalledOnce();
    expect(result.results).toHaveLength(2);
    expect(result.results[0].chunk).toBe('semantic hit');
    expect(result.results[1].chunk).toBe('lexical-expanded hit');
  });

  it('hybridSearch omits lexical vector pass when lexical lookup has no candidates', async () => {
    const embedTexts = vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);
    const search = vi.fn().mockResolvedValue([]);
    const $queryRaw = vi.fn().mockResolvedValue([]);
    const geminiService = { embedTexts } as unknown as GeminiService;
    const vectorStore = { search } as unknown as QdrantVectorStoreService;
    const prisma = { $queryRaw } as unknown as PrismaService;

    const service = new RagSearchService(geminiService, vectorStore, prisma);

    await service.hybridSearch('why nest', 5);

    expect(search).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith([0.1, 0.2, 0.3], 10, {});
  });
});
