type BuildGenericPromptOptions = {
  userPrompt: string;
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
};

export function buildGenericPrompt({
  userPrompt,
  systemInstruction,
  maxOutputTokens,
  temperature,
}: BuildGenericPromptOptions): string {
  const constraints: string[] = [
    'You are a helpful assistant.',
    systemInstruction ? `Follow this system instruction: ${systemInstruction}` : '',
    maxOutputTokens !== undefined
      ? `Keep the output reasonably short (aim for at most around ${maxOutputTokens} tokens).`
      : '',
    temperature !== undefined ? `Creativity level (0-1): ${temperature}` : '',
    'Return only valid JSON with this exact shape:',
    '{"text":"your answer as plain text"}',
    'Do not wrap the JSON in markdown fences.',
    'User request:',
    `"""${userPrompt}"""`,
  ].filter(Boolean);

  return constraints.join('\n');
}
