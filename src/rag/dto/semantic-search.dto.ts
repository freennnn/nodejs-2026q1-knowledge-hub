import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ARTICLE_STATUS_VALUES, ArticleStatus } from '@/common/enums/article-status.enum';
import { toNullableUuidInput } from '@/common/dto/nullable-uuid-input';

export class SemanticSearchDto {
  @ApiProperty({ example: 'How do I validate request bodies in Nest?' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  query!: string;

  @ApiPropertyOptional({ description: 'Max number of chunks to return', default: 5, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Optional category filter',
  })
  @Transform(({ value }) => toNullableUuidInput(value))
  @IsOptional()
  @IsUUID('4')
  categoryId?: string | null;

  @ApiPropertyOptional({
    enum: ARTICLE_STATUS_VALUES,
    description: 'Optional article status filter',
  })
  @IsOptional()
  @IsEnum(ArticleStatus)
  articleStatus?: ArticleStatus;

  @ApiPropertyOptional({
    type: [String],
    description: 'Match points that contain every listed tag',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
