import { Injectable } from '@nestjs/common';
import { ArticleStatus as PrismaArticleStatus, Prisma } from '@prisma/client';
import { GeminiService } from '@/ai/providers/gemini.service';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import type { SemanticSearchResponseDto } from '@/rag/dto/semantic-search.response.dto';
import type { RagArticleSearchFilter, RagArticleSearchResult } from '@/rag/vector-store/vector-store.types';
import { PrismaService } from '@/persistence/prisma/prisma.service';
import { QdrantVectorStoreService } from '@/rag/vector-store/qdrant-vector-store.service';

const HYBRID_RRF_K = 60;
const HYBRID_CANDIDATE_EXPANSION_FACTOR = 2;
const HYBRID_MAX_CANDIDATES = 12;

const appToPrismaArticleStatus = {
  [ArticleStatus.DRAFT]: PrismaArticleStatus.DRAFT,
  [ArticleStatus.PUBLISHED]: PrismaArticleStatus.PUBLISHED,
  [ArticleStatus.ARCHIVED]: PrismaArticleStatus.ARCHIVED,
} as const satisfies Record<ArticleStatus, PrismaArticleStatus>;

@Injectable()
export class RagSearchService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly vectorStore: QdrantVectorStoreService,
    private readonly prisma: PrismaService,
  ) {}

  async semanticSearch(
    query: string,
    limit: number,
    options?: { categoryId?: string | null; articleStatus?: ArticleStatus; tags?: string[] },
  ): Promise<SemanticSearchResponseDto> {
    const [vector] = await this.geminiService.embedTexts([query]);
    const filter = this.buildSearchFilter(options);
    const matches = await this.vectorStore.search(vector, limit, filter);

    return this.toResponse(matches);
  }

  async hybridSearch(
    query: string,
    limit: number,
    options?: { categoryId?: string | null; articleStatus?: ArticleStatus; tags?: string[] },
  ): Promise<SemanticSearchResponseDto> {
    const [vector] = await this.geminiService.embedTexts([query]);
    const filter = this.buildSearchFilter(options);
    const candidateLimit = this.resolveHybridCandidateLimit(limit);
    const semanticMatches = await this.vectorStore.search(vector, candidateLimit, filter);
    const lexicalArticleIds = await this.getLexicalCandidateArticleIds(query, candidateLimit, options);
    let lexicalMatches: RagArticleSearchResult[] = [];
    if (lexicalArticleIds.length > 0) {
      lexicalMatches = await this.vectorStore.search(vector, candidateLimit, {
        ...filter,
        articleIds: lexicalArticleIds,
      });
    }

    const mergedMatches = this.mergeWithReciprocalRankFusion(
      semanticMatches,
      lexicalMatches,
      lexicalArticleIds,
      limit,
    );

    return this.toResponse(mergedMatches);
  }

  private async getLexicalCandidateArticleIds(
    query: string,
    limit: number,
    options?: { categoryId?: string | null; articleStatus?: ArticleStatus; tags?: string[] },
  ): Promise<string[]> {
    const status = options?.articleStatus ? appToPrismaArticleStatus[options.articleStatus] : undefined;
    const tags = options?.tags ?? [];

    let statusCondition = Prisma.empty;
    if (status) {
      statusCondition = Prisma.sql`AND a.status = ${status}::"ArticleStatus"`;
    }

    let categoryCondition = Prisma.empty;
    if (options?.categoryId === null) {
      categoryCondition = Prisma.sql`AND a."categoryId" IS NULL`;
    } else if (options?.categoryId) {
      categoryCondition = Prisma.sql`AND a."categoryId" = ${options.categoryId}::uuid`;
    }

    let tagsCondition = Prisma.empty;
    if (tags.length > 0) {
      tagsCondition = Prisma.sql`AND EXISTS (
            SELECT 1
            FROM "_ArticleToTag" at
            INNER JOIN "Tag" t ON t.id = at."B"
            WHERE at."A" = a.id
              AND t.name = ANY(${tags}::text[])
          )`;
    }

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT a.id
      FROM "Article" a
      WHERE to_tsvector('english', coalesce(a.title, '') || ' ' || coalesce(a.content, ''))
            @@ plainto_tsquery('english', ${query})
      ${statusCondition}
      ${categoryCondition}
      ${tagsCondition}
      ORDER BY ts_rank_cd(
        to_tsvector('english', coalesce(a.title, '') || ' ' || coalesce(a.content, '')),
        plainto_tsquery('english', ${query})
      ) DESC, a."updatedAt" DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => row.id);
  }

  private mergeWithReciprocalRankFusion(
    semanticMatches: RagArticleSearchResult[],
    lexicalMatches: RagArticleSearchResult[],
    lexicalArticleIds: string[],
    limit: number,
  ): RagArticleSearchResult[] {
    const semanticRankByPointId = new Map<string, number>();
    for (const [index, match] of semanticMatches.entries()) {
      semanticRankByPointId.set(match.pointId, index + 1);
    }

    const lexicalRankByArticleId = new Map<string, number>();
    for (const [index, articleId] of lexicalArticleIds.entries()) {
      if (!lexicalRankByArticleId.has(articleId)) {
        lexicalRankByArticleId.set(articleId, index + 1);
      }
    }

    const candidatesByPointId = new Map<string, (typeof semanticMatches)[number]>();
    for (const match of semanticMatches) {
      candidatesByPointId.set(match.pointId, match);
    }
    for (const match of lexicalMatches) {
      if (!candidatesByPointId.has(match.pointId)) {
        candidatesByPointId.set(match.pointId, match);
      }
    }

    return [...candidatesByPointId.values()]
      .map((match) => {
        const semanticRank = semanticRankByPointId.get(match.pointId);
        const lexicalRank = lexicalRankByArticleId.get(match.payload.articleId);
        const rrfScore =
          (semanticRank ? 1 / (HYBRID_RRF_K + semanticRank) : 0) +
          (lexicalRank ? 1 / (HYBRID_RRF_K + lexicalRank) : 0);
        return { match, rrfScore };
      })
      .sort((left, right) => {
        if (right.rrfScore !== left.rrfScore) {
          return right.rrfScore - left.rrfScore;
        }
        return right.match.score - left.match.score;
      })
      .slice(0, limit)
      .map(({ match }) => match);
  }

  private buildSearchFilter(options?: {
    categoryId?: string | null;
    articleStatus?: ArticleStatus;
    tags?: string[];
  }): RagArticleSearchFilter {
    const filter: RagArticleSearchFilter = {};
    if (options?.articleStatus !== undefined) {
      filter.articleStatus = options.articleStatus;
    }
    if (options?.categoryId !== undefined) {
      filter.categoryId = options.categoryId;
    }
    if (options?.tags && options.tags.length > 0) {
      filter.tags = options.tags;
    }
    return filter;
  }

  private resolveHybridCandidateLimit(limit: number): number {
    return Math.min(
      HYBRID_MAX_CANDIDATES,
      Math.max(limit * HYBRID_CANDIDATE_EXPANSION_FACTOR, limit),
    );
  }

  private toResponse(matches: RagArticleSearchResult[]): SemanticSearchResponseDto {
    return {
      results: matches.map((m) => ({
        articleId: m.payload.articleId,
        articleTitle: m.payload.articleTitle,
        chunk: m.payload.chunk,
        similarity: m.score,
      })),
    };
  }
}
