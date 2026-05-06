type BuildTranslatePromptOptions = {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
};

export function buildTranslatePrompt({
  text,
  targetLanguage,
  sourceLanguage,
}: BuildTranslatePromptOptions): string {
  const sourceInstruction = sourceLanguage
    ? `The source language is "${sourceLanguage}". Set detectedLanguage to "${sourceLanguage}".`
    : 'Detect the source language and set detectedLanguage to the detected ISO language code.';

  return [
    `Translate the following article content to "${targetLanguage}".`,
    sourceInstruction,
    'Return only valid JSON with this exact shape:',
    '{"translatedText":"translated article content","detectedLanguage":"source language code"}',
    'Article content:',
    `"""${text}"""`,
  ].join('\n');
}
