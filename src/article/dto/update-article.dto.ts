import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { ARTICLE_STATUS_VALUES, ArticleStatus } from '@/common/enums/article-status.enum';

export class UpdateArticleDto {
  @ApiPropertyOptional({ example: 'Updated title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated content' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ enum: ARTICLE_STATUS_VALUES })
  @IsIn(ARTICLE_STATUS_VALUES)
  @IsOptional()
  status?: ArticleStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf((_, v) => v !== null)
  @IsUUID('4')
  @IsOptional()
  authorId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf((_, v) => v !== null)
  @IsUUID('4')
  @IsOptional()
  categoryId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
