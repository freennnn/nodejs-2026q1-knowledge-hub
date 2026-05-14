import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { toNullableUuidInput } from '@/common/dto/nullable-uuid-input';
import { ARTICLE_STATUS_VALUES, ArticleStatus } from '@/common/enums/article-status.enum';
import { ListQueryDto } from '@/common/dto/list-query.dto';

export class ListArticlesQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: ARTICLE_STATUS_VALUES })
  @IsIn(ARTICLE_STATUS_VALUES)
  @IsOptional()
  status?: ArticleStatus;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Category filter: omit = any category, null/empty = uncategorized only',
  })
  @Transform(({ value }) => toNullableUuidInput(value))
  @IsUUID('4')
  @IsOptional()
  categoryId?: string | null;

  @ApiPropertyOptional({ example: 'nodejs' })
  @IsString()
  @IsOptional()
  tag?: string;
}
