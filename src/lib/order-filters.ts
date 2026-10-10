import type { Prisma } from '@prisma/client';
import { vietnamDayRange } from '@/lib/vietnam-time';

const STATUSES = ['PENDING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED'] as const;
type Status = (typeof STATUSES)[number];

/**
 * Builds the Prisma filter shared by the order list and the order counts
 * from the query string: customerId, driverId (an id or "unassigned"),
 * date (YYYY-MM-DD, the Vietnam calendar day the order was taken), completedDate
 * (the day it was settled), q (customer name/code or order
 * code) and, unless `withStatus` is false, status.
 * Returns null when `date` or `completedDate` is malformed.
 */
export function orderWhere(
  factoryId: string,
  searchParams: URLSearchParams,
  { withStatus = true } = {}
): Prisma.OrderWhereInput | null {
  const where: Prisma.OrderWhereInput = { factoryId };

  const customerId = searchParams.get('customerId');
  if (customerId) where.customerId = customerId;

  const driverId = searchParams.get('driverId');
  if (driverId === 'unassigned') where.driverId = null;
  else if (driverId) where.driverId = driverId;

  const status = searchParams.get('status');
  if (withStatus && status && (STATUSES as readonly string[]).includes(status)) {
    where.status = status as Status;
  }

  const date = searchParams.get('date');
  if (date) {
    // The factory works on Vietnam time whatever the server's time zone is.
    const day = vietnamDayRange(date);
    if (!day) return null;
    where.createdAt = { gte: day.start, lt: day.end };
  }

  // Orders settled on one Vietnam day, whatever day they were taken.
  const completedDate = searchParams.get('completedDate');
  if (completedDate) {
    const day = vietnamDayRange(completedDate);
    if (!day) return null;
    where.completedAt = { gte: day.start, lt: day.end };
  }

  const q = searchParams.get('q')?.trim();
  if (q) {
    // Order codes are shown as "DH-" + the last 6 characters of the id.
    const code = q.replace(/^#?(dh-)?/i, '').toLowerCase();
    where.OR = [
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { customer: { code: { contains: q, mode: 'insensitive' } } },
      ...(code ? [{ id: { endsWith: code } }] : []),
    ];
  }

  return where;
}
