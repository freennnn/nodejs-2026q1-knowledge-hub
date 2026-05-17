import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { Schemas } from '@qdrant/js-client-rest';
import { loadRagEnv, type RagEnv } from '@/rag/rag-env';
import type { VectorStore } from '@/rag/vector-store/vector-store.interface';
import type {
  RagArticleSearchFilter,
  RagArticleSearchPayload,
  RagArticleSearchResult,
  RagArticleVectorPoint,
} from '@/rag/vector-store/vector-store.types';
import { TEXT_EMBEDDING_004_VECTOR_SIZE } from '@/rag/vector-store/vector-store.types';

@Injectable()
export class QdrantVectorStoreService implements VectorStore {
  private readonly logger = new Logger(QdrantVectorStoreService.name);
  private readonly client: QdrantClient;
  private readonly env: RagEnv;
  private readonly collectionName: string;
  private collectionReady = false;

  constructor(env: RagEnv = loadRagEnv(), client?: QdrantClient) {
    this.env = env;
    if (this.env.vectorDbProvider !== 'qdrant') {
      throw new Error(`Unsupported RAG_VECTOR_DB_PROVIDER: ${this.env.vectorDbProvider}`);
    }
    this.collectionName = this.env.vectorCollection;
    this.client = client ?? new QdrantClient({ url: this.env.vectorDbUrl });
  }

  async ensureCollection(): Promise<void> {
    if (this.collectionReady) {
      return;
    }
    await this.runQdrantOperation('ensureCollection', async () => {
      const { collections } = await this.client.getCollections();
      const exists = collections.some((c) => c.name === this.collectionName);
      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: TEXT_EMBEDDING_004_VECTOR_SIZE,
            distance: 'Cosine',
          },
        });
      }
    });
    this.collectionReady = true;
  }

  async deleteByArticleId(articleId: string): Promise<number> {
    await this.ensureCollection();
    return this.runQdrantOperation('deleteByArticleId', async () => {
      const articleFilter: Schemas['Filter'] = {
        must: [{ key: 'articleId', match: { value: articleId } }],
      };
      const countResult = await this.client.count(this.collectionName, {
        filter: articleFilter,
        exact: true,
      });
      const count = countResult.count;
      if (count === 0) {
        return 0;
      }
      await this.client.delete(this.collectionName, {
        wait: true,
        filter: articleFilter,
      });
      return count;
    });
  }

  async upsertPoints(points: RagArticleVectorPoint[]): Promise<void> {
    if (points.length === 0) {
      return;
    }
    await this.ensureCollection();
    await this.runQdrantOperation('upsertPoints', async () => {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: points as unknown as Schemas['PointStruct'][],
      });
    });
  }

  async search(
    queryVector: number[],
    limit: number,
    filter?: RagArticleSearchFilter,
  ): Promise<RagArticleSearchResult[]> {
    await this.ensureCollection();
    return this.runQdrantOperation('search', async () => {
      const qdrantFilter = this.buildSearchFilter(filter);
      const results = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        filter: qdrantFilter,
        with_payload: true,
      });
      return results.map((row) => this.parseSearchResult(row));
    });
  }

  private buildSearchFilter(filter?: RagArticleSearchFilter): Schemas['Filter'] | undefined {
    if (!filter) {
      return undefined;
    }
    const must: Schemas['Condition'][] = [];
    if (filter.articleStatus !== undefined) {
      must.push({ key: 'status', match: { value: filter.articleStatus } });
    }
    if (filter.categoryId !== undefined) {
      must.push({ key: 'categoryId', match: { value: filter.categoryId } });
    }
    if (filter.tags?.length) {
      for (const tag of filter.tags) {
        must.push({ key: 'tags', match: { value: tag } });
      }
    }
    if (filter.articleIds?.length) {
      const should = filter.articleIds.map((id) => ({
        key: 'articleId',
        match: { value: id },
      }));
      return {
        ...(must.length > 0 ? { must } : {}),
        should,
      };
    }
    return must.length > 0 ? { must } : undefined;
  }

  private parseSearchResult(raw: Schemas['ScoredPoint']): RagArticleSearchResult {
    const id = raw.id;
    const pointId =
      typeof id === 'string' || typeof id === 'number' ? String(id) : JSON.stringify(id);
    const score = typeof raw.score === 'number' ? raw.score : 0;
    const payload = this.parseSearchPayload(raw.payload);
    return { pointId, score, payload };
  }

  private parseSearchPayload(raw: unknown): RagArticleSearchPayload {
    if (!raw || typeof raw !== 'object') {
      throw new ServiceUnavailableException('Vector database returned invalid payload');
    }
    const p = raw as Record<string, unknown>;
    const articleId = p['articleId'];
    const articleTitle = p['articleTitle'];
    const chunk = p['chunk'];
    const chunkIndex = p['chunkIndex'];
    const status = p['status'];
    const categoryId = p['categoryId'];
    const tags = p['tags'];
    if (
      typeof articleId !== 'string' ||
      typeof articleTitle !== 'string' ||
      typeof chunk !== 'string' ||
      typeof chunkIndex !== 'number' ||
      typeof status !== 'string' ||
      !Array.isArray(tags) ||
      tags.some((t) => typeof t !== 'string')
    ) {
      throw new ServiceUnavailableException('Vector database returned invalid payload');
    }
    let categoryIdNorm: string | null = null;
    if (categoryId !== undefined && categoryId !== null) {
      if (typeof categoryId !== 'string') {
        throw new ServiceUnavailableException('Vector database returned invalid payload');
      }
      categoryIdNorm = categoryId;
    }
    return {
      articleId,
      articleTitle,
      chunk,
      chunkIndex,
      status: status as RagArticleSearchPayload['status'],
      categoryId: categoryIdNorm,
      tags: tags as string[],
      contentHash: typeof p['contentHash'] === 'string' ? p['contentHash'] : undefined,
      sourceUpdatedAt: typeof p['sourceUpdatedAt'] === 'string' ? p['sourceUpdatedAt'] : undefined,
    };
  }

  // On failure logs detail server-side, then throws ServiceUnavailableException for HTTP clients (503).
  private async runQdrantOperation<T>(operationLabel: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error';
      this.logger.warn(`Qdrant ${operationLabel} failed: ${detail}`);
      throw new ServiceUnavailableException('Vector database unavailable');
    }
  }
}
