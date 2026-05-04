import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SummarizeArticleDto {
  @ApiPropertyOptional({ example: 120 })
  @IsInt()
  @Min(10)
  @Max(2000)
  @IsOptional()
  maxWords?: number;

  @ApiPropertyOptional({ example: 'bullet_points' })
  @IsString()
  @IsOptional()
  style?: string;
}
