// Standard pagination for list endpoints.
//
// Request:  ?page=1&limit=20   (both optional)
// Response: { success: true, data: [...], meta: { page, limit, total_item, total_page } }

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 200;

export interface PaginationMeta {
  /** Current 1-based page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total matching item count */
  total_item: number;
  /** Total number of pages */
  total_page: number;
}

export type PageRequest = { page: number; limit: number; skip: number };

/** Reads `page` and `limit`; returns null when either is not a valid positive integer in range. */
export function parsePagination(searchParams: URLSearchParams): PageRequest | null {
  const read = (name: string, fallback: number) => {
    const raw = searchParams.get(name);
    if (raw === null || raw === '') return fallback;
    return /^\d+$/.test(raw) ? Number(raw) : NaN;
  };
  const page = read('page', 1);
  const limit = read('limit', DEFAULT_PAGE_SIZE);
  if (!Number.isInteger(page) || page < 1) return null;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) return null;
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta(request: { page: number; limit: number }, totalItem: number): PaginationMeta {
  return {
    page: request.page,
    limit: request.limit,
    total_item: totalItem,
    total_page: Math.ceil(totalItem / request.limit),
  };
}

/**
 * Page numbers a pagination bar shows: the first and last page, the current
 * page and its neighbours. `null` marks a gap ("…").
 */
export function pageWindow(current: number, total: number): Array<number | null> {
  const wanted = new Set([1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total));
  const pages = [...wanted].sort((a, b) => a - b);
  return pages.flatMap((page, index) => (index > 0 && page - pages[index - 1] > 1 ? [null, page] : [page]));
}

/** 1-based positions of the first and last item on the current page ("21–40"). */
export function pageRange(meta: PaginationMeta): { first: number; last: number } {
  if (meta.total_item === 0) return { first: 0, last: 0 };
  return {
    first: Math.min((meta.page - 1) * meta.limit + 1, meta.total_item),
    last: Math.min(meta.page * meta.limit, meta.total_item),
  };
}
