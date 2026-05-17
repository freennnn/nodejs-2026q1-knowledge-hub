import { ApiProperty } from '@nestjs/swagger';

export class SemanticSearchResultDto {
  @ApiProperty({ format: 'uuid' })
  articleId!: string;

  @ApiProperty()
  articleTitle!: string;

  @ApiProperty()
  chunk!: string;

  @ApiProperty({ description: 'Cosine similarity score from Qdrant (higher is more similar)' })
  similarity!: number;
}

export class SemanticSearchResponseDto {
  @ApiProperty({ type: [SemanticSearchResultDto] })
  results!: SemanticSearchResultDto[];
}
