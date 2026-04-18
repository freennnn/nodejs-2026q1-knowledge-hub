import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great article!' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  @IsNotEmpty()
  articleId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @ValidateIf((_, v) => v !== null)
  @IsUUID('4')
  @IsOptional()
  authorId?: string | null;
}
