import { afterEach, describe, expect, it } from 'vitest';
import { loadRagEnv } from '@/rag/rag-env';

const envKeysToClear = [
  'GEMINI_EMBEDDING_MODEL',
  'GEMINI_EMBEDDING_DIMENSION',
  'RAG_VECTOR_DB_PROVIDER',
  'RAG_VECTOR_DB_URL',
  'RAG_VECTOR_COLLECTION',
  'RAG_CHUNK_SIZE',
  'RAG_CHUNK_OVERLAP',
  'RAG_CHUNK_LOCALE',
  'RAG_CONVERSATION_MAX_MESSAGES',
] as const;

describe('loadRagEnv', () => {
  afterEach(() => {
    for (const key of envKeysToClear) {
      delete process.env[key];
    }
  });

  it('uses defaults when RAG vars are unset', () => {
    const env = loadRagEnv();
    expect(env.geminiEmbeddingModel).toBe('gemini-embedding-001');
    expect(env.geminiEmbeddingDimension).toBe(768);
    expect(env.vectorDbProvider).toBe('qdrant');
    expect(env.vectorDbUrl).toBe('http://localhost:6333');
    expect(env.vectorCollection).toBe('knowledge_hub_articles');
    expect(env.chunkSize).toBe(800);
    expect(env.chunkOverlap).toBe(200);
    expect(env.chunkLocale).toBe('en');
    expect(env.conversationMaxMessages).toBe(20);
  });

  it('throws when RAG_CHUNK_OVERLAP is not strictly less than RAG_CHUNK_SIZE', () => {
    process.env.RAG_CHUNK_SIZE = '200';
    process.env.RAG_CHUNK_OVERLAP = '200';
    expect(() => loadRagEnv()).toThrow(/strictly less than RAG_CHUNK_SIZE/);
  });

  it('parses overrides', () => {
    process.env.GEMINI_EMBEDDING_MODEL = 'custom-embed';
    process.env.GEMINI_EMBEDDING_DIMENSION = '1536';
    process.env.RAG_VECTOR_DB_URL = 'http://vectordb:6333';
    process.env.RAG_CHUNK_SIZE = '500';
    process.env.RAG_CHUNK_OVERLAP = '50';
    process.env.RAG_CHUNK_LOCALE = 'en-US';
    process.env.RAG_CONVERSATION_MAX_MESSAGES = '10';

    const env = loadRagEnv();
    expect(env.geminiEmbeddingModel).toBe('custom-embed');
    expect(env.geminiEmbeddingDimension).toBe(1536);
    expect(env.vectorDbUrl).toBe('http://vectordb:6333');
    expect(env.chunkSize).toBe(500);
    expect(env.chunkOverlap).toBe(50);
    expect(env.chunkLocale).toBe('en-US');
    expect(env.conversationMaxMessages).toBe(10);
  });

  it('throws when GEMINI_EMBEDDING_DIMENSION is invalid', () => {
    process.env.GEMINI_EMBEDDING_DIMENSION = '0';
    expect(() => loadRagEnv()).toThrow(/GEMINI_EMBEDDING_DIMENSION must be a positive integer/);
  });
});
