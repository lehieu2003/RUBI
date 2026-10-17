import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from '@/lib/api-response';
import { holdMonthToClose } from '@/lib/payroll-lock';

const LockSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  locked: z.boolean(),
});

// POST /api/reports/shifts/lock — close ("chốt") or reopen a payroll month.
// Body: { month: 'YYYY-MM', locked: boolean }
// A closed month's shifts cannot be changed by anyone until it is reopened.
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }
    const factoryId = session.factoryId;

    const parsed = LockSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError('Tháng không hợp lệ', 400);
    }
    const { month, locked } = parsed.data;

    if (!locked) {
      await prisma.payrollLock.deleteMany({ where: { factoryId, month } });
      return apiSuccess({ month, lockedAt: null });
    }

    // Closing with requests still waiting would silently leave them out of payroll.
    const [year, value] = month.split('-').map(Number);
    const lock = await prisma.$transaction(async (tx) => {
      // A shift write of the month still running finishes first and is counted.
      await holdMonthToClose(tx, factoryId, month);
      const pending = await tx.scheduleAssignment.count({
        where: {
          factoryId,
          status: 'PENDING',
          shiftDate: { gte: new Date(Date.UTC(year, value - 1, 1)), lt: new Date(Date.UTC(year, value, 1)) },
        },
      });
      if (pending > 0) {
        return apiError(`Còn ${pending} ca chờ duyệt trong tháng. Duyệt hoặc từ chối hết rồi mới chốt.`, 409, 'PENDING_SHIFTS');
      }
      return tx.payrollLock.upsert({
        where: { factoryId_month: { factoryId, month } },
        create: { factoryId, month },
        update: {},
      });
    });
    if (lock instanceof Response) return lock;
    return apiSuccess({ month, lockedAt: lock.lockedAt });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/reports/shifts/lock]', error);
    return apiError('Không thể chốt bảng công', 500);
  }
}
