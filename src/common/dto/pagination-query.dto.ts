import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;
  if (value.trim() === '') return undefined;
  return Number(value);
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Transform(({ value }) => toNumberOrUndefined(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ minimum: 1, default: 10 })
  @Transform(({ value }) => toNumberOrUndefined(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
