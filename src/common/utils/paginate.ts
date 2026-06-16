import { PaginatedResponse } from '@/common/types/paginated-response';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export function paginate<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
  const total = items.length;
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return { total, page, limit, data };
}

export function maybePaginate<T>(
  items: T[],
  query: PaginationQueryDto,
): T[] | PaginatedResponse<T> {
  const requested = query.page !== undefined || query.limit !== undefined;
  if (!requested) return items;

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  return paginate(items, page, limit);
}
