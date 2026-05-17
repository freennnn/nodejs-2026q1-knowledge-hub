import { ApiProperty } from '@nestjs/swagger';

export class ReindexResponseDto {
  @ApiProperty()
  indexedArticles!: number;

  @ApiProperty()
  indexedChunks!: number;

  @ApiProperty()
  vectorCollection!: string;
}
