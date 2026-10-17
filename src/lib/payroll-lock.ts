import { prisma } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { formatMonthVi } from '@/lib/schedule';

/** The main client or the client of an open transaction. */
type LockDb = Pick<typeof prisma, 'payrollLock'>;
type Tx = Pick<typeof prisma, '$executeRaw'>;

/** Months (YYYY-MM) among the given ones whose payroll is closed. */
export async function lockedMonths(factoryId: string, months: string[], db: LockDb = prisma): Promise<string[]> {
  if (months.length === 0) return [];
  const locks = await db.payrollLock.findMany({
    where: { factoryId, month: { in: [...new Set(months)] } },
    select: { month: true },
  });
  return locks.map((lock) => lock.month);
}

/**
 * Returns a 409 response when any of the months is closed, otherwise null.
 * Every route that changes shifts must call this first, inside its
 * transaction and after holdMonths.
 */
export async function rejectIfMonthLocked(factoryId: string, months: string[], db: LockDb = prisma) {
  const [locked] = await lockedMonths(factoryId, months, db);
  return locked
    ? apiError(
        `Bảng công tháng ${formatMonthVi(locked)} đã chốt, không thể thay đổi ca. Quản lý cần mở lại bảng công trước.`,
        409,
        'PAYROLL_LOCKED'
      )
    : null;
}

// Closing a month counts its pending requests and then writes the lock; a
// shift write checks the lock and then writes. Both take the same advisory
// lock per factory and month, held until their transaction commits, so a
// shift write either commits before the close counts, or sees the month
// closed. Shift writes take it shared and do not wait for each other.
const monthKey = (factoryId: string, month: string) => `payroll-month:${factoryId}:${month}`;

/** First statement of a transaction that changes shifts of these months. */
export async function holdMonths(tx: Tx, factoryId: string, months: string[]): Promise<void> {
  // Always in the same order, so two writes over several months cannot deadlock.
  for (const month of [...new Set(months)].sort()) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(hashtext(${monthKey(factoryId, month)}))`;
  }
}

/** First statement of the transaction that closes a month. */
export async function holdMonthToClose(tx: Tx, factoryId: string, month: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${monthKey(factoryId, month)}))`;
}
