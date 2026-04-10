import { valuesOf } from '@/common/utils/values-of';

export const ArticleStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type ArticleStatus = (typeof ArticleStatus)[keyof typeof ArticleStatus];

export const ARTICLE_STATUS_VALUES = valuesOf(ArticleStatus);
