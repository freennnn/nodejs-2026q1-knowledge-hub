import { createHash } from 'node:crypto';
import type { Article } from '@/common/types/article';

/**
 * Stable article-level hash used to detect content/metadata changes between reindex runs.
 */
export function buildArticleContentHash(
  article: Pick<Article, 'title' | 'content' | 'status' | 'categoryId' | 'tags'>,
): string {
  const normalizedTags = [...article.tags].sort();
  const canonical = [
    article.title,
    article.content,
    article.status,
    article.categoryId ?? '',
    normalizedTags.join(','),
  ].join('\n');

  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
