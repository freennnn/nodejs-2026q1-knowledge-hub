import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
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
import { toNullableUuidInput } from '@/common/dto/nullable-uuid-input';

export class SemanticSearchDto {
  @ApiProperty({ example: 'How do I validate request bodies in Nest?' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  query!: string;

  @ApiPropertyOptional({ description: 'Max number of chunks to return', default: 10, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Category filter: omit/undefined = no filter, null/empty = uncategorized only',
  })
  @Transform(({ value }) => toNullableUuidInput(value))
  // skip subsequent validators if null or undefined
  @IsOptional()
  @IsUUID('4')
  categoryId?: string | null;

  @ApiPropertyOptional({
    type: [String],
    description: 'Match points that contain every listed tag',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
