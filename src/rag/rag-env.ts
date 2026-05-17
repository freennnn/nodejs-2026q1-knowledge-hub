/**
 * RAG-related env reads in one place. Defaults match the values documented in `.env.example`; unset vars use those fallbacks
 * (same pattern as `GeminiService` and rate-limit guards: `??` / `Number(...)`).
 */

export type RagEnv = {
  /** Gemini embedding model id (e.g. gemini-embedding-001). */
  geminiEmbeddingModel: string;
  /** Embedding vector dimensionality shared by Gemini output + Qdrant collection. */
  geminiEmbeddingDimension: number;
  /** e.g. qdrant — reserved for future providers. */
  vectorDbProvider: string;
  /** Qdrant REST base URL (no trailing slash), e.g. http://vectordb:6333 */
  vectorDbUrl: string;
  vectorCollection: string;
  chunkSize: number;
  chunkOverlap: number;
  /** Locale passed to Intl.Segmenter for sentence boundaries. */
  chunkLocale: string;
  conversationMaxMessages: number;
};

export function loadRagEnv(): RagEnv {
  const chunkSize = Number(process.env.RAG_CHUNK_SIZE ?? 800);
  const chunkOverlap = Number(process.env.RAG_CHUNK_OVERLAP ?? 200);
  const geminiEmbeddingDimension = Number(process.env.GEMINI_EMBEDDING_DIMENSION ?? 768);
  if (chunkOverlap >= chunkSize) {
    throw new Error('RAG_CHUNK_OVERLAP must be strictly less than RAG_CHUNK_SIZE');
  }
  if (!Number.isInteger(geminiEmbeddingDimension) || geminiEmbeddingDimension <= 0) {
    throw new Error('GEMINI_EMBEDDING_DIMENSION must be a positive integer');
  }

  return {
    geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001',
    geminiEmbeddingDimension,
    vectorDbProvider: process.env.RAG_VECTOR_DB_PROVIDER ?? 'qdrant',
    vectorDbUrl: process.env.RAG_VECTOR_DB_URL ?? 'http://localhost:6333',
    vectorCollection: process.env.RAG_VECTOR_COLLECTION ?? 'knowledge_hub_articles',
    chunkSize,
    chunkOverlap,
    chunkLocale: process.env.RAG_CHUNK_LOCALE ?? 'en',
    conversationMaxMessages: Number(process.env.RAG_CONVERSATION_MAX_MESSAGES ?? 20),
  };
}
