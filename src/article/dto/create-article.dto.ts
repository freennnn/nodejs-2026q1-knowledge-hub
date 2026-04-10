import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import {
  ARTICLE_STATUS_VALUES,
  ArticleStatus,
} from '@/common/enums/article-status.enum';

export class CreateArticleDto {
  @ApiProperty({ example: 'Intro to Nest.js' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: '...' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({
    enum: ARTICLE_STATUS_VALUES,
    default: ArticleStatus.DRAFT,
  })
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

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
