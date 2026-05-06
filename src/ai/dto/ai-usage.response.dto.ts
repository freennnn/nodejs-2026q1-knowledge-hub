import { ApiProperty } from '@nestjs/swagger';

class AiUsageTokenTotalsDto {
  @ApiProperty()
  prompt!: number;

  @ApiProperty()
  candidates!: number;

  @ApiProperty()
  total!: number;
}

export class AiUsageResponseDto {
  @ApiProperty()
  totalRequests!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: {
      translate_article: 4,
      summarize_article: 7,
      analyze_article: 3,
      generic_prompt: 9,
    },
  })
  byEndpoint!: Record<string, number>;

  @ApiProperty({ type: AiUsageTokenTotalsDto })
  tokenTotals!: AiUsageTokenTotalsDto;
}
