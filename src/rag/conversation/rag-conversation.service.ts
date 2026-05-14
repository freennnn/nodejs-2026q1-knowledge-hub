import { Injectable } from '@nestjs/common';
import { loadRagEnv, type RagEnv } from '@/rag/rag-env';

export type RagConversationMessage = {
  role: 'user' | 'assistant';
  text: string;
};

@Injectable()
export class RagConversationService {
  private readonly conversations = new Map<string, RagConversationMessage[]>();

  constructor(private readonly env: RagEnv = loadRagEnv()) {}

  getHistory(conversationId: string): RagConversationMessage[] {
    const history = this.conversations.get(conversationId);
    return history ? [...history] : [];
  }

  appendTurn(conversationId: string, question: string, answer: string): void {
    const history = this.getHistory(conversationId);
    history.push(
      { role: 'user', text: question },
      { role: 'assistant', text: answer },
    );
    const maxMessages = Math.max(1, this.env.conversationMaxMessages);
    this.conversations.set(conversationId, history.slice(-maxMessages));
  }
}
