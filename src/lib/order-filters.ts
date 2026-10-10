import type { Prisma } from '@prisma/client';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ['PENDING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED'] as const;
type Status = (typeof STATUSES)[number];

/**
 * Builds the Prisma filter shared by the order list and the order counts
 * from the query string: customerId, driverId (an id or "unassigned"),
 * date (YYYY-MM-DD, a Vietnam calendar day), q (customer name/code or order
 * code) and, unless `withStatus` is false, status.
 * Returns null when `date` is malformed.
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
    if (!DATE_ONLY.test(date)) return null;
    // The factory works on Vietnam time whatever the server's time zone is.
    const start = new Date(`${date}T00:00:00+07:00`);
    if (Number.isNaN(start.getTime())) return null;
    where.createdAt = { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
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
