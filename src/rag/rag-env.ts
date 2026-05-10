/**
 * Centralized parsing for RAG / vector DB environment variables.
 * Call {@link loadRagEnv} once at startup (e.g. from RagModule.onModuleInit) or read lazily in services.
 */

export type RagEnv = {
  /** Gemini embedding model id (e.g. text-embedding-004). */
  geminiEmbeddingModel: string;
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

const DEFAULT_GEMINI_EMBEDDING_MODEL = 'text-embedding-004';
const DEFAULT_VECTOR_DB_PROVIDER = 'qdrant';
const DEFAULT_VECTOR_DB_URL = 'http://localhost:6333';
const DEFAULT_VECTOR_COLLECTION = 'knowledge_hub_articles';
const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_CHUNK_LOCALE = 'en';
const DEFAULT_CONVERSATION_MAX_MESSAGES = 20;

function parsePositiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return n;
}

function parseNonNegativeInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return n;
}

/**
 * Reads and validates RAG-related env vars. Throws on invalid numeric combinations.
 */
export function loadRagEnv(): RagEnv {
  const chunkSize = parsePositiveInt(process.env.RAG_CHUNK_SIZE, DEFAULT_CHUNK_SIZE, 'RAG_CHUNK_SIZE');
  const chunkOverlap = parseNonNegativeInt(
    process.env.RAG_CHUNK_OVERLAP,
    DEFAULT_CHUNK_OVERLAP,
    'RAG_CHUNK_OVERLAP',
  );
  if (chunkOverlap >= chunkSize) {
    throw new Error('RAG_CHUNK_OVERLAP must be strictly less than RAG_CHUNK_SIZE');
  }

  const geminiEmbeddingModel =
    process.env.GEMINI_EMBEDDING_MODEL?.trim() || DEFAULT_GEMINI_EMBEDDING_MODEL;
  const vectorDbProvider =
    process.env.RAG_VECTOR_DB_PROVIDER?.trim() || DEFAULT_VECTOR_DB_PROVIDER;
  const vectorDbUrl = process.env.RAG_VECTOR_DB_URL?.trim() || DEFAULT_VECTOR_DB_URL;
  const vectorCollection =
    process.env.RAG_VECTOR_COLLECTION?.trim() || DEFAULT_VECTOR_COLLECTION;
  const chunkLocale = process.env.RAG_CHUNK_LOCALE?.trim() || DEFAULT_CHUNK_LOCALE;
  const conversationMaxMessages = parsePositiveInt(
    process.env.RAG_CONVERSATION_MAX_MESSAGES,
    DEFAULT_CONVERSATION_MAX_MESSAGES,
    'RAG_CONVERSATION_MAX_MESSAGES',
  );

  return {
    geminiEmbeddingModel,
    vectorDbProvider,
    vectorDbUrl,
    vectorCollection,
    chunkSize,
    chunkOverlap,
    chunkLocale,
    conversationMaxMessages,
  };
}
