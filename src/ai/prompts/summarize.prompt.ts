import type { SummarizeMaxLength } from '../dto/summarize-max-length';

type BuildSummarizePromptOptions = {
  text: string;
  maxLength: SummarizeMaxLength;
  style?: string;
};

const LENGTH_GUIDANCE: Record<SummarizeMaxLength, string> = {
  short:
    'Keep the summary brief: roughly 1–2 short paragraphs or up to about 80–120 words. Focus only on the essentials.',
  medium:
    'Use a moderate length: roughly 150–250 words. Cover the main ideas and a few supporting points.',
  detailed:
    'Use a fuller summary: roughly 300–450 words (or a structured outline if that fits better). Include nuance and important context where useful.',
};

export function buildSummarizePrompt({
  text,
  maxLength,
  style,
}: BuildSummarizePromptOptions): string {
  const lengthHint = LENGTH_GUIDANCE[maxLength];
  const styleHint = style ? `Style / format hint: ${style}.` : 'Style: neutral and factual.';

  return [
    'Summarize the following article content for a reader who wants the key points.',
    lengthHint,
    styleHint,
    'Return only valid JSON with this exact shape:',
    '{"summary":"string summary text"}',
    'Do not wrap the JSON in markdown fences.',
    'Article content:',
    `"""${text}"""`,
  ].join('\n');
}
