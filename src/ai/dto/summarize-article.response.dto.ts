import { ApiProperty } from '@nestjs/swagger';
import { AiTokenUsageDto } from './ai-token-usage.dto';

export class SummarizeArticleResponseDto {
  @ApiProperty()
  articleId!: string;

  @ApiProperty()
  summary!: string;

  @ApiProperty({
    description:
      'Article content length in JavaScript string UTF-16 code units (same as String.prototype.length)',
  })
  originalLength!: number;

  @ApiProperty({
    description:
      'Summary length in JavaScript string UTF-16 code units (same as String.prototype.length)',
  })
  summaryLength!: number;

  @ApiProperty({ description: 'True if the response was served from the in-memory cache' })
  cacheHit!: boolean;

  @ApiProperty({ type: AiTokenUsageDto })
  tokenUsage!: AiTokenUsageDto;
}
