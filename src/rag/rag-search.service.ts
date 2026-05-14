import { Injectable } from '@nestjs/common';
import { GeminiService } from '@/ai/providers/gemini.service';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import type { SemanticSearchResponseDto } from '@/rag/dto/semantic-search.response.dto';
import type { RagPointMatchFilter } from '@/rag/vector-store/vector-store.types';
import { QdrantVectorStoreService } from '@/rag/vector-store/qdrant-vector-store.service';

@Injectable()
export class RagSearchService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly vectorStore: QdrantVectorStoreService,
  ) {}

  async semanticSearch(
    query: string,
    limit: number,
    options?: { categoryId?: string | null; tags?: string[] },
  ): Promise<SemanticSearchResponseDto> {
    const [vector] = await this.geminiService.embedTexts([query]);

    const filter: RagPointMatchFilter = {
      articleStatus: ArticleStatus.PUBLISHED,
    };

    if (options?.categoryId !== undefined) {
      filter.categoryId = options.categoryId;
    }
    if (options?.tags !== undefined && options.tags.length > 0) {
      filter.tags = options.tags;
    }

    const matches = await this.vectorStore.search(vector, limit, filter);

    return {
      matches: matches.map((m) => ({
        pointId: m.pointId,
        score: m.score,
        articleId: m.payload.articleId,
        articleTitle: m.payload.articleTitle,
        chunk: m.payload.chunk,
        chunkIndex: m.payload.chunkIndex,
        categoryId: m.payload.categoryId,
        tags: m.payload.tags,
      })),
    };
  }
}
