import { describe, expect, it, vi } from 'vitest';
import { GeminiService } from '@/ai/providers/gemini.service';
import { RagConversationService } from '@/rag/conversation/rag-conversation.service';
import { RagChatService } from '@/rag/rag-chat.service';
import { RagSearchService } from '@/rag/rag-search.service';

describe('RagChatService', () => {
  it('builds answer from retrieved chunks and deduplicates sources by article', async () => {
    const ragSearchService = {
      semanticSearch: vi.fn().mockResolvedValue({
        results: [
          {
            articleId: '00000000-0000-4000-8000-000000000001',
            articleTitle: 'A',
            chunk: 'First chunk',
            similarity: 0.91,
          },
          {
            articleId: '00000000-0000-4000-8000-000000000001',
            articleTitle: 'A',
            chunk: 'Second chunk',
            similarity: 0.88,
          },
          {
            articleId: '00000000-0000-4000-8000-000000000002',
            articleTitle: 'B',
            chunk: 'Third chunk',
            similarity: 0.8,
          },
        ],
      }),
    } as unknown as RagSearchService;
    const ragConversationService = new RagConversationService({
      geminiEmbeddingModel: 'text-embedding-004',
      vectorDbProvider: 'qdrant',
      vectorDbUrl: 'http://localhost:6333',
      vectorCollection: 'knowledge_hub_articles',
      chunkSize: 800,
      chunkOverlap: 200,
      chunkLocale: 'en',
      conversationMaxMessages: 20,
    });
    const geminiService = {
      completeRagAnswer: vi.fn().mockResolvedValue('Grounded answer'),
    } as unknown as GeminiService;

    const service = new RagChatService(ragSearchService, ragConversationService, geminiService);
    const res = await service.chat('What is used?', '00000000-0000-4000-8000-000000000099');

    expect(res.answer).toBe('Grounded answer');
    expect(res.conversationId).toBe('00000000-0000-4000-8000-000000000099');
    expect(res.sources).toHaveLength(2);
    expect(res.sources[0].articleId).toBe('00000000-0000-4000-8000-000000000001');
    expect(res.sources[0].relevantChunk).toBe('First chunk');
    expect(res.sources[1].articleId).toBe('00000000-0000-4000-8000-000000000002');
  });

  it('generates a conversationId if missing and appends history', async () => {
    const ragSearchService = {
      semanticSearch: vi.fn().mockResolvedValue({ results: [] }),
    } as unknown as RagSearchService;
    const ragConversationService = new RagConversationService({
      geminiEmbeddingModel: 'text-embedding-004',
      vectorDbProvider: 'qdrant',
      vectorDbUrl: 'http://localhost:6333',
      vectorCollection: 'knowledge_hub_articles',
      chunkSize: 800,
      chunkOverlap: 200,
      chunkLocale: 'en',
      conversationMaxMessages: 20,
    });
    const geminiService = {
      completeRagAnswer: vi.fn().mockResolvedValue('No context answer'),
    } as unknown as GeminiService;

    const service = new RagChatService(ragSearchService, ragConversationService, geminiService);
    const first = await service.chat('Q1?');
    const second = await service.chat('Q2?', first.conversationId);

    expect(first.conversationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(second.conversationId).toBe(first.conversationId);
    expect((geminiService.completeRagAnswer as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });
});
