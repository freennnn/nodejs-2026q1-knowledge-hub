import { BadRequestException } from '@nestjs/common';
import { SortOrder } from '@/common/dto/sort-query.dto';

function comparePrimitive(a: unknown, b: unknown): number {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
  if (aNull && bNull) return 0;
  if (aNull) return 1; // nulls/undefined last
  if (bNull) return -1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

export function maybeSort<T>(
  items: T[],
  sortBy: string | undefined,
  order: SortOrder | undefined,
  allowedFields: readonly string[],
): T[] {
  if (!sortBy) return items;

  if (!allowedFields.includes(sortBy)) {
    throw new BadRequestException(
      `Invalid sortBy. Allowed: ${allowedFields.join(', ')}`,
    );
  }

  const dir = (order ?? SortOrder.ASC) === SortOrder.DESC ? -1 : 1;
  return [...items].sort((left, right) => {
    const cmp = comparePrimitive((left as any)[sortBy], (right as any)[sortBy]);
    return cmp * dir;
  });
}
