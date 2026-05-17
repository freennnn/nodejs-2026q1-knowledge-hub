import { ApiProperty } from '@nestjs/swagger';
import { AiTokenUsageDto } from './ai-token-usage.dto';

export class GenericPromptResponseDto {
  @ApiProperty()
  text!: string;

  @ApiProperty()
  cacheHit!: boolean;

  @ApiProperty({ type: AiTokenUsageDto })
  tokenUsage!: AiTokenUsageDto;

  @ApiProperty({
    description:
      'Conversation session id. Reuse it in the next /ai/generate call to preserve context.',
  })
  sessionId!: string;
}
