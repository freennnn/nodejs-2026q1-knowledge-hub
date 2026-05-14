import { describe, expect, it, vi } from 'vitest';
import { GeminiService } from '@/ai/providers/gemini.service';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import { RagSearchService } from '@/rag/rag-search.service';
import { QdrantVectorStoreService } from '@/rag/vector-store/qdrant-vector-store.service';

describe('RagSearchService', () => {
  it('embeds query and searches with published-only filter and optional metadata filters', async () => {
    const embedTexts = vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);
    const search = vi.fn().mockResolvedValue([
      {
        pointId: 'a:0',
        score: 0.95,
        payload: {
          articleId: '00000000-0000-4000-8000-000000000001',
          articleTitle: 'T',
          chunk: 'hello',
          chunkIndex: 0,
          status: ArticleStatus.PUBLISHED,
          categoryId: null,
          tags: ['news'],
        },
      },
    ]);
    const geminiService = { embedTexts } as unknown as GeminiService;
    const vectorStore = { search } as unknown as QdrantVectorStoreService;

    const service = new RagSearchService(geminiService, vectorStore);

    const result = await service.semanticSearch('why nest', 5, {
      categoryId: '00000000-0000-4000-8000-000000000099',
      tags: ['news'],
    });

    expect(embedTexts).toHaveBeenCalledWith(['why nest']);
    expect(search).toHaveBeenCalledWith([0.1, 0.2, 0.3], 5, {
      articleStatus: ArticleStatus.PUBLISHED,
      categoryId: '00000000-0000-4000-8000-000000000099',
      tags: ['news'],
    });
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].chunk).toBe('hello');
    expect(result.matches[0].articleTitle).toBe('T');
  });

  it('supports explicit null category filter (uncategorized-only)', async () => {
    const embedTexts = vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]);
    const search = vi.fn().mockResolvedValue([]);
    const geminiService = { embedTexts } as unknown as GeminiService;
    const vectorStore = { search } as unknown as QdrantVectorStoreService;

    const service = new RagSearchService(geminiService, vectorStore);

    await service.semanticSearch('why nest', 5, {
      categoryId: null,
    });

    expect(search).toHaveBeenCalledWith([0.1, 0.2, 0.3], 5, {
      articleStatus: ArticleStatus.PUBLISHED,
      categoryId: null,
    });
  });
});
