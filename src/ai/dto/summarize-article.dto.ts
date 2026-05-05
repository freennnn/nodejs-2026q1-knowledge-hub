import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SUMMARIZE_MAX_LENGTH_VALUES, SummarizeMaxLength } from './summarize-max-length';

export class SummarizeArticleDto {
  @ApiPropertyOptional({
    enum: SUMMARIZE_MAX_LENGTH_VALUES,
    default: SummarizeMaxLength.MEDIUM,
    description: 'Target summary size (defaults to medium when omitted)',
  })
  @IsIn(SUMMARIZE_MAX_LENGTH_VALUES)
  @IsOptional()
  maxLength?: SummarizeMaxLength;

  @ApiPropertyOptional({
    example: 'sarcastic or bullet points',
    description: 'Optional presentation hint (not required by the assignment)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  style?: string;
}
