import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { SORT_ORDER_VALUES, SortOrder } from '@/common/dto/sort-query.dto';

// List means sorting and paginating can be applied
export class ListQueryDto extends PaginationQueryDto {
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
