import type { ArticleStatus } from '@/common/enums/article-status.enum';

// Metadata (quadrant's point's payload) per vector row (one text chunk of an article).
export type RagArticleSearchPayload = {
  articleId: string;
  articleTitle: string;
  chunk: string;
  chunkIndex: number;
  status: ArticleStatus;
  categoryId: string | null;
  tags: string[];
  contentHash?: string;
  sourceUpdatedAt?: string;
};

// Upsert row: embedding + payload metadata (vector DB analogue of columns).
export type RagArticleVectorPoint = {
  id: string;
  vector: number[];
  payload: RagArticleSearchPayload;
};

// Payload predicates when querying for similar points (metadata filters).
export type RagArticleSearchFilter = {
  articleStatus?: ArticleStatus;
  categoryId?: string | null;
  tags?: string[];
};

// Similarity-search row: which point matched, score, payload — not the full stored point (no embedding here).
export type RagArticleSearchResult = {
  pointId: string;
  // Qdrant cosine score (higher is more similar).
  score: number;
  payload: RagArticleSearchPayload;
};

// Default output dimension for `text-embedding-004` (Gemini).
export const TEXT_EMBEDDING_004_VECTOR_SIZE = 768;
