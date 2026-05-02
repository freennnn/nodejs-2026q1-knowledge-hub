import { Controller, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { AiService } from './ai.service';
import { TranslateArticleDto } from './dto/translate-article.dto';
import { TranslateArticleResponseDto } from './dto/translate-article.response.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('/articles/:articleId/translate')
  async translate(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
    @Body() dto: TranslateArticleDto,
  ): Promise<TranslateArticleResponseDto> {
    return this.aiService.translateArticle(articleId, dto.targetLanguage, dto.sourceLanguage);
  }
}
