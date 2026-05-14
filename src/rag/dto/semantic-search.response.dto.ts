import { ApiProperty } from '@nestjs/swagger';

export class SemanticSearchMatchDto {
  @ApiProperty()
  pointId!: string;

  @ApiProperty({ description: 'Cosine similarity score from Qdrant (higher is more similar)' })
  score!: number;

  @ApiProperty({ format: 'uuid' })
  articleId!: string;

  @ApiProperty()
  articleTitle!: string;

  @ApiProperty()
  chunk!: string;

  @ApiProperty()
  chunkIndex!: number;

  @ApiProperty({ format: 'uuid', nullable: true })
  categoryId!: string | null;

  @ApiProperty({ type: [String] })
  tags!: string[];
}

export class SemanticSearchResponseDto {
  @ApiProperty({ type: [SemanticSearchMatchDto] })
  matches!: SemanticSearchMatchDto[];
}
