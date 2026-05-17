import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { RagEnv } from '@/rag/rag-env';
import { RAG_ENV } from '@/rag/rag.tokens';

export type RagConversationMessage = {
  role: 'user' | 'assistant';
  text: string;
};

@Injectable()
export class RagConversationService {
  private readonly conversations = new Map<string, RagConversationMessage[]>();

  constructor(@Inject(RAG_ENV) private readonly env: RagEnv) {}

  getHistory(userId: string, conversationId: string): RagConversationMessage[] {
    const history = this.conversations.get(this.buildKey(userId, conversationId));
    return history ? [...history] : [];
  }

  getHistoryOrThrow(userId: string, conversationId: string): RagConversationMessage[] {
    const history = this.getHistory(userId, conversationId);
    if (history.length === 0) {
      throw new NotFoundException('Conversation history not found');
    }
    return history;
  }

  appendTurn(userId: string, conversationId: string, question: string, answer: string): void {
    const history = this.getHistory(userId, conversationId);
    history.push(
      { role: 'user', text: question },
      { role: 'assistant', text: answer },
    );
    const maxMessages = Math.max(1, this.env.conversationMaxMessages);
    this.conversations.set(this.buildKey(userId, conversationId), history.slice(-maxMessages));
  }

  private buildKey(userId: string, conversationId: string): string {
    return `${userId}:${conversationId}`;
  }
}
