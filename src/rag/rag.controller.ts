import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiRateLimitGuard } from '@/ai/guards/ai-rate-limit.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import type { AuthUser } from '@/auth/types/auth-user.type';
import { UserRole } from '@/common/enums/user-role.enum';
import { RagChatHistoryResponseDto } from '@/rag/dto/rag-chat-history.response.dto';
import { RagChatDto } from '@/rag/dto/rag-chat.dto';
import { RagChatResponseDto } from '@/rag/dto/rag-chat.response.dto';
import { ReindexRequestDto } from '@/rag/dto/reindex-request.dto';
import { ReindexResponseDto } from '@/rag/dto/reindex-response.dto';
import { SemanticSearchDto } from '@/rag/dto/semantic-search.dto';
import {
  SemanticSearchResponseDto,
} from '@/rag/dto/semantic-search.response.dto';
import { RagArticleIndexService } from '@/rag/rag-article-index.service';
import { RagConversationService } from '@/rag/conversation/rag-conversation.service';
import { RagChatService } from '@/rag/rag-chat.service';
import { RagSearchService } from '@/rag/rag-search.service';

@ApiTags('rag')
@ApiBearerAuth('access-token')
@UseGuards(AiRateLimitGuard)
@Controller('ai/rag')
export class RagController {
  constructor(
    private readonly ragSearchService: RagSearchService,
    private readonly ragArticleIndexService: RagArticleIndexService,
    private readonly ragChatService: RagChatService,
    private readonly ragConversationService: RagConversationService,
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

  @ApiResponse({ status: 204, description: 'Article vectors removed from index' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article/index entries are not found' })
  @ApiResponse({ status: 503, description: 'Vector database unavailable' })
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(204)
  @Delete('index/articles/:articleId')
  async deleteIndexedArticle(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
  ): Promise<void> {
    const removedCount = await this.ragArticleIndexService.removeArticleVectors(articleId);
    if (removedCount === 0) {
      throw new NotFoundException(`No indexed vectors found for article "${articleId}"`);
    }
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

  @ApiResponse({ status: 200, type: RagChatResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({
    status: 429,
    description: 'Too many requests (same AI rate-limit bucket as other Gemini routes)',
  })
  @ApiResponse({ status: 503, description: 'Vector database or Gemini unavailable' })
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @HttpCode(200)
  @Post('chat')
  async chat(
    @Body() dto: RagChatDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<RagChatResponseDto> {
    return this.ragChatService.chat(actor.userId, dto.question, dto.conversationId);
  }

  @ApiResponse({ status: 200, type: RagChatHistoryResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Conversation history not found' })
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @HttpCode(200)
  @Get('chat/:conversationId/history')
  getChatHistory(
    @Param('conversationId', new ParseUUIDPipe({ version: '4' })) conversationId: string,
    @CurrentUser() actor: AuthUser,
  ): RagChatHistoryResponseDto {
    const messages = this.ragConversationService.getHistoryOrThrow(actor.userId, conversationId);
    return { conversationId, messages };
  }
}
