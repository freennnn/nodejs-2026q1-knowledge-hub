import { Injectable } from '@nestjs/common';
import { GeminiService } from '@/ai/providers/gemini.service';
import type { ArticleStatus } from '@/common/enums/article-status.enum';
import type { SemanticSearchResponseDto } from '@/rag/dto/semantic-search.response.dto';
import type { RagArticleSearchFilter } from '@/rag/vector-store/vector-store.types';
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
    options?: { categoryId?: string | null; articleStatus?: ArticleStatus; tags?: string[] },
  ): Promise<SemanticSearchResponseDto> {
    const [vector] = await this.geminiService.embedTexts([query]);

    const filter: RagArticleSearchFilter = {};

    if (options?.articleStatus !== undefined) {
      filter.articleStatus = options.articleStatus;
    }
    if (options?.categoryId !== undefined) {
      filter.categoryId = options.categoryId;
    }
    if (options?.tags !== undefined && options.tags.length > 0) {
      filter.tags = options.tags;
    }

    const matches = await this.vectorStore.search(vector, limit, filter);

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
