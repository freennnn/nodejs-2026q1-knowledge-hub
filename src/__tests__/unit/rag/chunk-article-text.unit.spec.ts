import { describe, expect, it } from 'vitest';
import { chunkArticleText } from '@/rag/chunking/chunk-article-text';

describe('chunkArticleText', () => {
  it('returns empty array for blank text', () => {
    expect(chunkArticleText('   ', 800, 200, 'en')).toEqual([]);
    expect(chunkArticleText('', 800, 200, 'en')).toEqual([]);
  });

  it('returns a single chunk when text fits in chunkSize', () => {
    expect(chunkArticleText('Hello world.', 800, 200, 'en')).toEqual(['Hello world.']);
  });

  it('splits long text into multiple chunks with overlap', () => {
    const chunkSize = 120;
    const chunkOverlap = 40;
    const text = 'x'.repeat(250);
    const chunks = chunkArticleText(text, chunkSize, chunkOverlap, 'en');
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= chunkSize)).toBe(true);
    let stitched = chunks[0];
    for (let i = 1; i < chunks.length; i++) {
      stitched += chunks[i].slice(chunkOverlap);
    }
    expect(stitched).toBe(text);
  });

  it('splits an oversized run without sentence boundaries', () => {
    const chunkSize = 100;
    const chunkOverlap = 10;
    const long = 'x'.repeat(250);
    const chunks = chunkArticleText(long, chunkSize, chunkOverlap, 'en');
    expect(chunks.length).toBeGreaterThan(1);
    let stitched = chunks[0];
    for (let i = 1; i < chunks.length; i++) {
      stitched += chunks[i].slice(chunkOverlap);
    }
    expect(stitched).toBe(long);
  });
});
