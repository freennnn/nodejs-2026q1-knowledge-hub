import { ApiProperty } from '@nestjs/swagger';

export class SummarizeArticleResponseDto {
  @ApiProperty()
  articleId!: string;

  @ApiProperty()
  summary!: string;

  @ApiProperty({ description: 'Estimated word count of the summary' })
  wordCount!: number;

  @ApiProperty()
  cacheHit!: boolean;
}
