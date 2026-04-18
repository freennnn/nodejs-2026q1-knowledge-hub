import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  ARTICLE_STATUS_VALUES,
  ArticleStatus,
} from '@/common/enums/article-status.enum';
import { ListQueryDto } from '@/common/dto/list-query.dto';

export class ListArticlesQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: ARTICLE_STATUS_VALUES })
  @IsIn(ARTICLE_STATUS_VALUES)
  @IsOptional()
  status?: ArticleStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID('4')
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'nodejs' })
  @IsString()
  @IsOptional()
  tag?: string;
}
