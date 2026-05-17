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
    const text =
      'Sentence one is fairly short. Sentence two adds more details for the article body. ' +
      'Sentence three keeps the flow natural and deterministic. Sentence four makes sure we exceed the target chunk size. ' +
      'Sentence five is here for overlap verification.';
    const chunks = chunkArticleText(text, chunkSize, chunkOverlap, 'en');
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= chunkSize)).toBe(true);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startsWith(chunks[i - 1].slice(-chunkOverlap))).toBe(true);
    }
  });

  it('splits an oversized run without sentence boundaries', () => {
    const chunkSize = 100;
    const chunkOverlap = 10;
    const long = 'x'.repeat(250);
    const chunks = chunkArticleText(long, chunkSize, chunkOverlap, 'en');
    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startsWith(chunks[i - 1].slice(-chunkOverlap))).toBe(true);
    }
  });

  it('is deterministic for same input and config', () => {
    const text =
      'A. B. C. D. E. F. G. H. I. J. K. L. ' +
      'This second paragraph includes enough content to trigger multiple chunks.';
    const first = chunkArticleText(text, 80, 20, 'en');
    const second = chunkArticleText(text, 80, 20, 'en');
    expect(first).toEqual(second);
  });
});
