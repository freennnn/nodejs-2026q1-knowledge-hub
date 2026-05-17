import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  UseGuards,
  Get,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuthUser } from '@/auth/types/auth-user.type';
import { UserRole } from '@/common/enums/user-role.enum';
import { AiService } from './ai.service';
import { TranslateArticleDto } from './dto/translate-article.dto';
import { TranslateArticleResponseDto } from './dto/translate-article.response.dto';
import { SummarizeArticleDto } from './dto/summarize-article.dto';
import { SummarizeArticleResponseDto } from './dto/summarize-article.response.dto';
import { AnalyzeArticleDto } from './dto/analyze-article.dto';
import { AnalyzeArticleResponseDto } from './dto/analyze-article.response.dto';
import { GenericPromptDto } from './dto/generic-prompt.dto';
import { GenericPromptResponseDto } from './dto/generic-prompt.response.dto';
import { AiUsageResponseDto } from './dto/ai-usage.response.dto';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';

@ApiTags('ai')
@ApiBearerAuth('access-token')
@UseGuards(AiRateLimitGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiResponse({ status: 200, type: TranslateArticleResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed or empty article content' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({
    status: 429,
    description: 'Too many AI requests. Please retry after cooldown window',
  })
  @ApiResponse({ status: 502, description: 'Gemini rejected the request or returned an error' })
  @ApiResponse({ status: 503, description: 'Gemini unreachable, timed out, or rate limited' })
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @HttpCode(200)
  @Post('/articles/:articleId/translate')
  async translate(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() dto: TranslateArticleDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<TranslateArticleResponseDto> {
    return this.aiService.translateArticle(
      articleId,
      dto.targetLanguage,
      dto.sourceLanguage,
      actor,
    );
  }

  @ApiResponse({ status: 200, type: SummarizeArticleResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed or empty article content' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({
    status: 429,
    description: 'Too many AI requests. Please retry after cooldown window',
  })
  @ApiResponse({ status: 502, description: 'Gemini rejected the request or returned an error' })
  @ApiResponse({ status: 503, description: 'Gemini unreachable, timed out, or rate limited' })
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @HttpCode(200)
  @Post('/articles/:articleId/summarize')
  async summarize(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() dto: SummarizeArticleDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<SummarizeArticleResponseDto> {
    return this.aiService.summarizeArticle(articleId, dto.maxLength, dto.style, actor);
  }

  @ApiResponse({ status: 200, type: AnalyzeArticleResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed or empty article content' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  @ApiResponse({
    status: 429,
    description: 'Too many AI requests. Please retry after cooldown window',
  })
  @ApiResponse({ status: 502, description: 'Gemini rejected the request or returned an error' })
  @ApiResponse({ status: 503, description: 'Gemini unreachable, timed out, or rate limited' })
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @HttpCode(200)
  @Post('/articles/:articleId/analyze')
  async analyze(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() dto: AnalyzeArticleDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<AnalyzeArticleResponseDto> {
    return this.aiService.analyzeArticle(articleId, dto.task, actor);
  }

  @ApiResponse({ status: 200, type: GenericPromptResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @ApiResponse({
    status: 429,
    description: 'Too many AI requests. Please retry after cooldown window',
  })
  @ApiResponse({ status: 502, description: 'Gemini rejected the request or returned an error' })
  @ApiResponse({ status: 503, description: 'Gemini unreachable, timed out, or rate limited' })
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER)
  @HttpCode(200)
  @Post('/generate')
  async genericPrompt(
    @Body() dto: GenericPromptDto,
    @CurrentUser() actor: AuthUser,
  ): Promise<GenericPromptResponseDto> {
    return this.aiService.genericPrompt(dto, actor);
  }

  @ApiResponse({ status: 200, type: AiUsageResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  @Roles(UserRole.ADMIN)
  @Get('/usage')
  getUsage(): AiUsageResponseDto {
    return this.aiService.getUsageSnapshot();
  }
}
