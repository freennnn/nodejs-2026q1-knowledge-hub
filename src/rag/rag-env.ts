/**
 * RAG-related env reads in one place. Defaults match the values documented in `.env.example`; unset vars use those fallbacks
 * (same pattern as `GeminiService` and rate-limit guards: `??` / `Number(...)`).
 */
export type RagEnv = {
  geminiEmbeddingModel: string;
  vectorDbProvider: string;
  vectorDbUrl: string;
  vectorCollection: string;
  chunkSize: number;
  chunkOverlap: number;
  chunkLocale: string;
  conversationMaxMessages: number;
};

export function loadRagEnv(): RagEnv {
  const chunkSize = Number(process.env.RAG_CHUNK_SIZE ?? 800);
  const chunkOverlap = Number(process.env.RAG_CHUNK_OVERLAP ?? 200);
  if (chunkOverlap >= chunkSize) {
    throw new Error('RAG_CHUNK_OVERLAP must be strictly less than RAG_CHUNK_SIZE');
  }

  return {
    geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',
    vectorDbProvider: process.env.RAG_VECTOR_DB_PROVIDER ?? 'qdrant',
    vectorDbUrl: process.env.RAG_VECTOR_DB_URL ?? 'http://localhost:6333',
    vectorCollection: process.env.RAG_VECTOR_COLLECTION ?? 'knowledge_hub_articles',
    chunkSize,
    chunkOverlap,
    chunkLocale: process.env.RAG_CHUNK_LOCALE ?? 'en',
    conversationMaxMessages: Number(process.env.RAG_CONVERSATION_MAX_MESSAGES ?? 20),
  };
}
