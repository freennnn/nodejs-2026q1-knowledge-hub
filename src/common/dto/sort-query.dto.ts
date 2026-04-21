import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { valuesOf } from '@/common/utils/values-of';

export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

export const SORT_ORDER_VALUES = valuesOf(SortOrder);

export class SortQueryDto {
  @ApiPropertyOptional({ example: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ enum: SORT_ORDER_VALUES, default: SortOrder.ASC })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsIn(SORT_ORDER_VALUES)
  @IsOptional()
  order?: SortOrder;
}
