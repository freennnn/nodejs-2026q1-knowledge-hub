import { valuesOf } from '@/common/utils/values-of';

export const SummarizeMaxLength = {
  SHORT: 'short',
  MEDIUM: 'medium',
  DETAILED: 'detailed',
} as const;
export type SummarizeMaxLength = (typeof SummarizeMaxLength)[keyof typeof SummarizeMaxLength];
export const SUMMARIZE_MAX_LENGTH_VALUES = valuesOf(SummarizeMaxLength);
// export type SummarizeMaxLength = 'short' | 'medium' | 'detailed';
// export const SUMMARIZE_MAX_LENGTH_VALUES: SummarizeMaxLength[] = ['short', 'medium', 'detailed'];
