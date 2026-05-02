import { ApiProperty } from '@nestjs/swagger';

export class TranslateArticleResponseDto {
  @ApiProperty()
  articleId!: string;

  @ApiProperty()
  translatedText!: string;

  @ApiProperty()
  detectedLanguage!: string;
}
