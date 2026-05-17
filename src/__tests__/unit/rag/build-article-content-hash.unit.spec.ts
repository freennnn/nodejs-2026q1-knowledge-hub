import { describe, expect, it } from 'vitest';
import { ArticleStatus } from '@/common/enums/article-status.enum';
import { buildArticleContentHash } from '@/rag/chunking/build-article-content-hash';

describe('buildArticleContentHash', () => {
  it('is stable regardless of tags order', () => {
    const a = buildArticleContentHash({
      title: 'Hello',
      content: 'World',
      status: ArticleStatus.PUBLISHED,
      categoryId: 'cat-1',
      tags: ['b', 'a'],
    });
    const b = buildArticleContentHash({
      title: 'Hello',
      content: 'World',
      status: ArticleStatus.PUBLISHED,
      categoryId: 'cat-1',
      tags: ['a', 'b'],
    });
    expect(a).toBe(b);
  });

  it('changes when source article content changes', () => {
    const oldHash = buildArticleContentHash({
      title: 'Hello',
      content: 'Body v1',
      status: ArticleStatus.PUBLISHED,
      categoryId: null,
      tags: ['x'],
    });
    const newHash = buildArticleContentHash({
      title: 'Hello',
      content: 'Body v2',
      status: ArticleStatus.PUBLISHED,
      categoryId: null,
      tags: ['x'],
    });
    expect(oldHash).not.toBe(newHash);
  });
});
