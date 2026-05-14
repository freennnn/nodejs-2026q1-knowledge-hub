import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { RagConversationService } from '@/rag/conversation/rag-conversation.service';

describe('RagConversationService', () => {
  it('stores history scoped by userId + conversationId', () => {
    const service = new RagConversationService({
      geminiEmbeddingModel: 'text-embedding-004',
      vectorDbProvider: 'qdrant',
      vectorDbUrl: 'http://localhost:6333',
      vectorCollection: 'knowledge_hub_articles',
      chunkSize: 800,
      chunkOverlap: 200,
      chunkLocale: 'en',
      conversationMaxMessages: 20,
    });

    const conversationId = '00000000-0000-4000-8000-000000000999';
    service.appendTurn('u1', conversationId, 'Q1', 'A1');
    service.appendTurn('u2', conversationId, 'Q2', 'A2');

    expect(service.getHistory('u1', conversationId).map((m) => m.text)).toEqual(['Q1', 'A1']);
    expect(service.getHistory('u2', conversationId).map((m) => m.text)).toEqual(['Q2', 'A2']);
  });

  it('keeps only last N messages and throws NotFound when empty', () => {
    const service = new RagConversationService({
      geminiEmbeddingModel: 'text-embedding-004',
      vectorDbProvider: 'qdrant',
      vectorDbUrl: 'http://localhost:6333',
      vectorCollection: 'knowledge_hub_articles',
      chunkSize: 800,
      chunkOverlap: 200,
      chunkLocale: 'en',
      conversationMaxMessages: 3,
    });

    expect(() => service.getHistoryOrThrow('u1', '00000000-0000-4000-8000-000000000001')).toThrow(
      NotFoundException,
    );

    service.appendTurn('u1', '00000000-0000-4000-8000-000000000001', 'Q1', 'A1');
    service.appendTurn('u1', '00000000-0000-4000-8000-000000000001', 'Q2', 'A2');
    const history = service.getHistory('u1', '00000000-0000-4000-8000-000000000001');

    expect(history).toHaveLength(3);
    expect(history.map((m) => m.text)).toEqual(['A1', 'Q2', 'A2']);
  });
});
