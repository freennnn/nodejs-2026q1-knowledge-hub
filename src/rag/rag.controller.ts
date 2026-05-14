import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiRateLimitGuard } from '@/ai/guards/ai-rate-limit.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user-role.enum';
import { ReindexRequestDto } from '@/rag/dto/reindex-request.dto';
import { ReindexResponseDto } from '@/rag/dto/reindex-response.dto';
import { SemanticSearchDto } from '@/rag/dto/semantic-search.dto';
import {
  SemanticSearchResponseDto,
} from '@/rag/dto/semantic-search.response.dto';
import { RagArticleIndexService } from '@/rag/rag-article-index.service';
import { RagSearchService } from '@/rag/rag-search.service';

@ApiTags('rag')
@ApiBearerAuth('access-token')
@UseGuards(AiRateLimitGuard)
@Controller('ai/rag')
export class RagController {
  constructor(
    private readonly ragSearchService: RagSearchService,
    private readonly ragArticleIndexService: RagArticleIndexService,
  ) {}

  @ApiResponse({ status: 200, type: ReindexResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({
    status: 429,
    description: 'Too many requests (same AI rate-limit bucket as other Gemini routes)',
  })
  @ApiResponse({ status: 503, description: 'Vector database or Gemini unavailable' })
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(200)
  @Post('index')
  async reindex(@Body() dto: ReindexRequestDto): Promise<ReindexResponseDto> {
    return this.ragArticleIndexService.reindex(dto);
  }

  @ApiResponse({ status: 200, type: SemanticSearchResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({
    status: 429,
    description: 'Too many requests (same AI rate-limit bucket as other Gemini routes)',
  })
  @ApiResponse({ status: 502, description: 'Gemini embedding error' })
  @ApiResponse({ status: 503, description: 'Vector database unavailable' })
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @HttpCode(200)
  @Post('search')
  async semanticSearch(@Body() dto: SemanticSearchDto): Promise<SemanticSearchResponseDto> {
    const limit = dto.limit ?? 5;
    return this.ragSearchService.semanticSearch(dto.query, limit, {
      categoryId: dto.categoryId,
      articleStatus: dto.articleStatus,
      tags: dto.tags,
    });
  }
}
