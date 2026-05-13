/**
 * Overlapping windows over Unicode code points.
 * `locale` is accepted for API symmetry with RAG env (future: snap boundaries via Intl.Segmenter).
 */
export function chunkArticleText(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  _locale: string,
): string[] {
  void _locale;
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const cp = [...trimmed];
  if (cp.length <= chunkSize) {
    return [trimmed];
  }

  const step = Math.max(1, chunkSize - chunkOverlap);
  const chunks: string[] = [];
  for (let i = 0; i < cp.length; i += step) {
    chunks.push(cp.slice(i, i + chunkSize).join(''));
    if (i + chunkSize >= cp.length) {
      break;
    }
  }
  return chunks;
}
