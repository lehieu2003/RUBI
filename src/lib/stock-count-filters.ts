import type { Prisma } from '@prisma/client';
import { vietnamDayRange } from '@/lib/vietnam-time';

/**
 * Builds the Prisma filter shared by the stock count history and its summary
 * from the query string: productId, and from / to (YYYY-MM-DD, Vietnam
 * calendar days, both inclusive).
 * Returns null when a date is malformed or `from` is after `to`.
 */
export function stockCountWhere(
  factoryId: string,
  searchParams: URLSearchParams
): Prisma.StockCountWhereInput | null {
  const where: Prisma.StockCountWhereInput = { factoryId };

  const productId = searchParams.get('productId');
  if (productId) where.productId = productId;

  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const fromDay = from ? vietnamDayRange(from) : undefined;
  const toDay = to ? vietnamDayRange(to) : undefined;
  if (fromDay === null || toDay === null) return null;
  if (fromDay && toDay && fromDay.start > toDay.start) return null;
  if (fromDay || toDay) {
    where.createdAt = { gte: fromDay?.start, lt: toDay?.end };
  }

  return where;
}
