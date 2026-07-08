import type { PaginatedResult } from '@developer-playground/shared-types';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export function toSkipTake(p: PaginationParams): { skip: number; take: number } {
  return { skip: (p.page - 1) * p.pageSize, take: p.pageSize };
}

export function buildPage<T>(
  items: T[],
  total: number,
  p: PaginationParams,
): PaginatedResult<T> {
  return {
    items,
    total,
    page: p.page,
    pageSize: p.pageSize,
    totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
  };
}
