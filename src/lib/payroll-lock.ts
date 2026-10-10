import { prisma } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { formatMonthVi } from '@/lib/schedule';

/** Months (YYYY-MM) among the given ones whose payroll is closed. */
export async function lockedMonths(factoryId: string, months: string[]): Promise<string[]> {
  if (months.length === 0) return [];
  const locks = await prisma.payrollLock.findMany({
    where: { factoryId, month: { in: [...new Set(months)] } },
    select: { month: true },
  });
  return locks.map((lock) => lock.month);
}

/**
 * Returns a 409 response when any of the months is closed, otherwise null.
 * Every route that changes shifts must call this first.
 */
export async function rejectIfMonthLocked(factoryId: string, months: string[]) {
  const [locked] = await lockedMonths(factoryId, months);
  return locked
    ? apiError(
        `Bảng công tháng ${formatMonthVi(locked)} đã chốt, không thể thay đổi ca. Quản lý cần mở lại bảng công trước.`,
        409,
        'PAYROLL_LOCKED'
      )
    : null;
}
