type BuildSummarizePromptOptions = {
  text: string;
  maxWords?: number;
  style?: string;
};

export function buildSummarizePrompt({ text, maxWords, style }: BuildSummarizePromptOptions): string {
  const lengthHint =
    maxWords !== undefined
      ? `Keep the summary around ${maxWords} words or fewer.`
      : 'Choose an appropriate concise length.';
  const styleHint = style ? `Style: ${style}.` : 'Style: neutral and factual.';

  return [
    'Summarize the following article content for a reader who wants the key points.',
    lengthHint,
    styleHint,
    'Return only valid JSON with this exact shape:',
    '{"summary":"string summary text","wordCount":123}',
    'wordCount must be an integer estimate of how many words are in "summary".',
    'Article content:',
    `"""${text}"""`,
  ].join('\n');
}
