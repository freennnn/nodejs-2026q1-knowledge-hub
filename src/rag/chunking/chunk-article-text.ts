function normalizeForChunking(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim();
}

function getSentenceBoundaries(text: string, locale: string): number[] {
  const boundaries: number[] = [];
  const segmenterCtor = (
    Intl as unknown as {
      Segmenter?: new (
        locale: string,
        options: { granularity: 'sentence' },
      ) => {
        segment(input: string): Iterable<{ segment: string; index: number }>;
      };
    }
  ).Segmenter;

  if (segmenterCtor) {
    const segmenter = new segmenterCtor(locale, { granularity: 'sentence' });
    for (const part of segmenter.segment(text)) {
      const end = part.index + part.segment.length;
      if (end > 0 && end <= text.length) {
        boundaries.push(end);
      }
    }
  } else {
    const sentenceRegex = /[^.!?\n]+(?:[.!?]+|\n|$)/g;
    let match: RegExpExecArray | null;
    while ((match = sentenceRegex.exec(text)) !== null) {
      boundaries.push(match.index + match[0].length);
    }
  }

  boundaries.push(text.length);
  return [...new Set(boundaries)].sort((a, b) => a - b);
}

/**
 * Deterministic sentence-aware chunking with fixed char overlap.
 *
 * Steps:
 * 1) Normalize input text (`\r\n` -> `\n`, trim edges)
 * 2) Split into sentences using `Intl.Segmenter(locale, { granularity: 'sentence' })`
 * 3) Pack sentences into chunks up to `chunkSize`
 * 4) Prefix each next chunk with the previous chunk tail (`chunkOverlap` chars)
 * 5) Hard-split any single sentence longer than `chunkSize`
 */
export function chunkArticleText(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  locale: string,
): string[] {
  const normalized = normalizeForChunking(text);
  if (!normalized) {
    return [];
  }

  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const boundaries = getSentenceBoundaries(normalized, locale);
  const chunks: string[] = [];
  let start = 0;
  let previousEnd = 0;
  while (start < normalized.length) {
    const targetEnd = Math.min(normalized.length, start + chunkSize);
    const candidate = boundaries.filter((b) => b > previousEnd && b <= targetEnd);
    const end = candidate.length > 0 ? candidate[candidate.length - 1] : targetEnd;
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) {
      break;
    }
    previousEnd = end;
    start = Math.max(0, end - chunkOverlap);
  }

  return chunks;
}
