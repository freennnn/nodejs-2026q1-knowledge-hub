import { ApiProperty } from '@nestjs/swagger';

export class RagChatSourceDto {
  @ApiProperty({ format: 'uuid' })
  articleId!: string;

  @ApiProperty()
  articleTitle!: string;

  @ApiProperty()
  relevantChunk!: string;
}

export class RagChatResponseDto {
  @ApiProperty()
  answer!: string;

  @ApiProperty({ type: [RagChatSourceDto] })
  sources!: RagChatSourceDto[];

  @ApiProperty({ format: 'uuid' })
  conversationId!: string;
}
