import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ReindexRequestDto {
  @ApiPropertyOptional({
    default: false,
    description: 'If true, index only published articles; default false indexes all statuses',
  })
  @IsOptional()
  @IsBoolean()
  onlyPublished?: boolean;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Optional list of article IDs to selectively reindex',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  articleIds?: string[];
}
