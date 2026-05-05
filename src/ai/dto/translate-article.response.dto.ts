import { ApiProperty } from '@nestjs/swagger';
import { AiTokenUsageDto } from './ai-token-usage.dto';

export class TranslateArticleResponseDto {
  @ApiProperty()
  articleId!: string;

  @ApiProperty()
  translatedText!: string;

  @ApiProperty()
  detectedLanguage!: string;

  @ApiProperty()
  cacheHit!: boolean;

  @ApiProperty({ type: AiTokenUsageDto })
  tokenUsage!: AiTokenUsageDto;
}
