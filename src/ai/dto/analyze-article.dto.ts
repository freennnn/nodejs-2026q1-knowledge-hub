import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const AnalyzeArticleTask = {
  REVIEW: 'review',
  BUGS: 'bugs',
  OPTIMIZE: 'optimize',
  EXPLAIN: 'explain',
} as const;

export type AnalyzeArticleTask = (typeof AnalyzeArticleTask)[keyof typeof AnalyzeArticleTask];
export const ANALYZE_ARTICLE_TASK_VALUES = Object.values(AnalyzeArticleTask);

export class AnalyzeArticleDto {
  @ApiPropertyOptional({
    enum: ANALYZE_ARTICLE_TASK_VALUES,
    default: AnalyzeArticleTask.REVIEW,
    description: 'Analysis task type (defaults to review when omitted)',
  })
  @IsIn(ANALYZE_ARTICLE_TASK_VALUES)
  @IsOptional()
  task?: AnalyzeArticleTask;
}
