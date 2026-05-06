import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
export class TranslateArticleDto {
  @ApiProperty({ example: 'fr' })
  @IsString()
  @IsNotEmpty()
  targetLanguage!: string;

  @ApiPropertyOptional({ example: 'ru' })
  @IsString()
  @IsOptional()
  sourceLanguage?: string;
}
