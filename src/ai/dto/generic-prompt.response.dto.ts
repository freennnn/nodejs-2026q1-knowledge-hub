import { ApiProperty } from '@nestjs/swagger';
import { AiTokenUsageDto } from './ai-token-usage.dto';

export class GenericPromptResponseDto {
  @ApiProperty()
  text!: string;

  @ApiProperty()
  cacheHit!: boolean;

  @ApiProperty({ type: AiTokenUsageDto })
  tokenUsage!: AiTokenUsageDto;
}
