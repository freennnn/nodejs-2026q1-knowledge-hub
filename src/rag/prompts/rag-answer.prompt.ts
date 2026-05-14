import type { RagConversationMessage } from '@/rag/conversation/rag-conversation.service';

type ContextChunk = {
  articleId: string;
  articleTitle: string;
  chunk: string;
};

export function buildRagAnswerPrompt(
  question: string,
  context: ContextChunk[],
  history: RagConversationMessage[],
): string {
  const historySection =
    history.length === 0
      ? 'No previous conversation.'
      : history
          .map((m, idx) => `${idx + 1}. ${m.role.toUpperCase()}: ${m.text}`)
          .join('\n');

  const contextSection =
    context.length === 0
      ? 'No relevant knowledge base chunks were retrieved.'
      : context
          .map(
            (c, idx) =>
              `Chunk ${idx + 1}\nArticle ID: ${c.articleId}\nTitle: ${c.articleTitle}\nText: ${c.chunk}`,
          )
          .join('\n\n');

  return [
    'You are a Knowledge Hub assistant.',
    'Answer ONLY using the retrieved context chunks.',
    'If context is insufficient, say so explicitly.',
    'Do not invent sources.',
    '',
    'Conversation history:',
    historySection,
    '',
    'Retrieved context:',
    contextSection,
    '',
    `User question: ${question}`,
    '',
    'Return plain text answer only.',
  ].join('\n');
}
