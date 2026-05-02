import { Injectable } from '@nestjs/common';
import { ArticleService } from '@/article/article.service';
import { GeminiService } from './providers/gemini.service';
import { TranslateArticleResponseDto } from './dto/translate-article.response.dto';

@Injectable()
export class AiService {
  constructor(
    private readonly gemini: GeminiService,
    private readonly articleService: ArticleService,
  ) {}

  async translateArticle(
    id: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<TranslateArticleResponseDto> {
    const article = await this.articleService.findOne(id);
    //const translated = await gemini
    return {
      articleId: article.id,
      translatedText: 'Viva la french',
      detectedLanguage: 'fr',
    };
  }
}
