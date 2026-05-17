import { ApiProperty } from '@nestjs/swagger';
import type { RagConversationMessage } from '@/rag/conversation/rag-conversation.service';

export class RagChatHistoryMessageDto implements RagConversationMessage {
  @ApiProperty({ enum: ['user', 'assistant'] })
  role!: 'user' | 'assistant';

  @ApiProperty()
  text!: string;
}

export class RagChatHistoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  conversationId!: string;

  @ApiProperty({ type: [RagChatHistoryMessageDto] })
  messages!: RagChatHistoryMessageDto[];
}
