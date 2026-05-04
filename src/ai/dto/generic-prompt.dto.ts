import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class GenericPromptDto {
  @ApiProperty({ example: 'Write a short greeting in Spanish.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(512)
  prompt!: string;

  @ApiPropertyOptional({ example: 'Be concise. No markdown.' })
  @IsString()
  @IsOptional()
  @MaxLength(512)
  systemInstruction?: string;

  @ApiPropertyOptional({ example: 512, description: 'Cap hint for the model output' })
  @IsNumber()
  @Min(16)
  @Max(512)
  @IsOptional()
  maxOutputTokens?: number;

  @ApiPropertyOptional({ example: 0.7, description: 'Sampling temperature 0-1' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  temperature?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'If true, identical requests may return cached responses',
  })
  @IsBoolean()
  @IsOptional()
  useCache?: boolean;
}
