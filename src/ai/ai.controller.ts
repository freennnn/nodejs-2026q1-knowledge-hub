import { Controller, Post, Body, Param, ParseUUIDPipe, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuthUser } from '@/auth/types/auth-user.type';
import { UserRole } from '@/common/enums/user-role.enum';
import { AiService } from './ai.service';
import { TranslateArticleDto } from './dto/translate-article.dto';
import { TranslateArticleResponseDto } from './dto/translate-article.response.dto';

@ApiTags('ai')
@ApiBearerAuth('access-token')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiResponse({ status: 200, type: TranslateArticleResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed or empty article content' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
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
}
