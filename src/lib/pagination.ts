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
