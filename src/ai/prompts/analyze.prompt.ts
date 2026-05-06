import type { AnalyzeArticleTask } from '../dto/analyze-article.dto';

type BuildAnalyzePromptOptions = {
  text: string;
  task: AnalyzeArticleTask;
};

const TASK_GUIDANCE: Record<AnalyzeArticleTask, string> = {
  review: 'Provide a concise editorial review of clarity, structure, and correctness.',
  bugs: 'Focus on issues, inconsistencies, contradictions, and likely mistakes.',
  optimize: 'Focus on actionable improvements for quality, readability, and effectiveness.',
  explain: 'Explain the content in a clear and educational way for a general audience.',
};

export function buildAnalyzePrompt({ text, task }: BuildAnalyzePromptOptions): string {
  return [
    `Analyze the following article content. Task: ${task}.`,
    TASK_GUIDANCE[task],
    'Return only valid JSON with this exact shape:',
    '{"analysis":"string","suggestions":["string"],"severity":"info"|"warning"|"error"}',
    'Rules:',
    '- analysis must be a non-empty string',
    '- suggestions must be an array of short actionable strings (can be empty)',
    '- severity must be exactly one of: info, warning, error',
    'Do not wrap JSON in markdown fences.',
    'Article content:',
    `"""${text}"""`,
  ].join('\n');
}
