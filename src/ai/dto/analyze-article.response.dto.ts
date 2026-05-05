import { ApiProperty } from '@nestjs/swagger';
import { AiTokenUsageDto } from './ai-token-usage.dto';

export const AnalyzeSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

export type AnalyzeSeverity = (typeof AnalyzeSeverity)[keyof typeof AnalyzeSeverity];
export const ANALYZE_SEVERITY_VALUES = Object.values(AnalyzeSeverity);

export class AnalyzeArticleResponseDto {
  @ApiProperty()
  articleId!: string;

  @ApiProperty()
  analysis!: string;

  @ApiProperty({
    type: [String],
  })
  suggestions!: string[];

  @ApiProperty({
    enum: ANALYZE_SEVERITY_VALUES,
  })
  severity!: AnalyzeSeverity;

  @ApiProperty({ description: 'True if the response was served from the in-memory cache' })
  cacheHit!: boolean;

  @ApiProperty({ type: AiTokenUsageDto })
  tokenUsage!: AiTokenUsageDto;
}
