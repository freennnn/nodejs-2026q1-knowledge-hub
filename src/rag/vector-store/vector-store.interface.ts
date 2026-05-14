import type {
  RagPointMatch,
  RagPointMatchFilter,
  RagVectorPoint,
} from '@/rag/vector-store/vector-store.types';

// Contract for vector persistence used by RAG indexing and search.
export interface VectorStore {
  // Qdrant stores vectors in a named collection (aka table or index). Creates if missing.
  ensureCollection(): Promise<void>;

  // Removes all points for an article; returns how many points were removed (before delete).
  deleteByArticleId(articleId: string): Promise<number>;

  upsertPoints(points: RagVectorPoint[]): Promise<void>;

  search(
    queryVector: number[],
    limit: number,
    filter?: RagPointMatchFilter,
  ): Promise<RagPointMatch[]>;
}
