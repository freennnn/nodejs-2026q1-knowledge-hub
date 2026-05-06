type BuildGenericPromptOptions = {
  userPrompt: string;
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
  conversationHistory?: Array<{
    userPrompt: string;
    assistantText: string;
  }>;
};

export function buildGenericPrompt({
  userPrompt,
  systemInstruction,
  maxOutputTokens,
  temperature,
  conversationHistory,
}: BuildGenericPromptOptions): string {
  const conversationContextBlock =
    conversationHistory && conversationHistory.length > 0
      ? [
          'Conversation context (oldest to newest):',
          ...conversationHistory.flatMap((turn, index) => [
            `Turn ${index + 1} user: """${turn.userPrompt}"""`,
            `Turn ${index + 1} assistant: """${turn.assistantText}"""`,
          ]),
        ].join('\n')
      : '';

  const constraints: string[] = [
    'You are a helpful assistant.',
    systemInstruction ? `Follow this system instruction: ${systemInstruction}` : '',
    maxOutputTokens !== undefined
      ? `Keep the output reasonably short (aim for at most around ${maxOutputTokens} tokens).`
      : '',
    temperature !== undefined ? `Creativity level (0-1): ${temperature}` : '',
    conversationContextBlock,
    'Return only valid JSON with this exact shape:',
    '{"text":"your answer as plain text"}',
    'Do not wrap the JSON in markdown fences.',
    'User request:',
    `"""${userPrompt}"""`,
  ].filter(Boolean);

  return constraints.join('\n');
}
