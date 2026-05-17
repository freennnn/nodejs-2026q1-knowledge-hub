import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RagChatDto {
  @ApiProperty({ example: 'What does this project use for DTO validation?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  question!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional conversation id for multi-turn context',
  })
  @IsOptional()
  @IsUUID('4')
  conversationId?: string;
}
