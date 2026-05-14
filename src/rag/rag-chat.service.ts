import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { RagChatResponseDto } from '@/rag/dto/rag-chat.response.dto';
import { RagConversationService } from '@/rag/conversation/rag-conversation.service';
import { buildRagAnswerPrompt } from '@/rag/prompts/rag-answer.prompt';
import { RagSearchService } from '@/rag/rag-search.service';
import { GeminiService } from '@/ai/providers/gemini.service';

@Injectable()
export class RagChatService {
  private readonly retrievalLimit = 5;

  constructor(
    private readonly ragSearchService: RagSearchService,
    private readonly ragConversationService: RagConversationService,
    private readonly geminiService: GeminiService,
  ) {}

  // 1. Resolve conversationId (reuse passed one or create new).
  // 2. Load text history for that conversation.
  // 3. Run semantic search with limit = 5 for the current question.
  // 4. Build prompt from: current question + text history + those retrieved chunks.
  // 5. Call Gemini.
  // 6. Save only the new text turn (question, answer) to conversation history.
  // So yes: retrieved chunks are used per request to build prompt, but not persisted in the conversation history map.

  async chat(userId: string, question: string, conversationId?: string): Promise<RagChatResponseDto> {
    const resolvedConversationId = conversationId ?? randomUUID();
    const history = this.ragConversationService.getHistory(userId, resolvedConversationId);
    const retrieval = await this.ragSearchService.semanticSearch(question, this.retrievalLimit);
    const prompt = buildRagAnswerPrompt(question, retrieval.results, history);
    const answer = await this.geminiService.completeRagAnswer(prompt);

    this.ragConversationService.appendTurn(userId, resolvedConversationId, question, answer);

    // if multiple matches/chunks from the same article are returned - we only filter article iself
    const sourcesByArticle = new Map<
      string,
      { articleId: string; articleTitle: string; relevantChunk: string }
    >();
    for (const row of retrieval.results) {
      if (!sourcesByArticle.has(row.articleId)) {
        sourcesByArticle.set(row.articleId, {
          articleId: row.articleId,
          articleTitle: row.articleTitle,
          relevantChunk: row.chunk,
        });
      }
    }

    return {
      answer,
      sources: [...sourcesByArticle.values()],
      conversationId: resolvedConversationId,
    };
  }
}
