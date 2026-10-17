import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { monthOf, toDateOnly } from '@/lib/schedule';
import { holdMonths, rejectIfMonthLocked } from '@/lib/payroll-lock';
import { apiSuccess, apiError } from '@/lib/api-response';

const ReviewSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  action: z.enum(['APPROVE', 'REJECT']),
});

// POST /api/schedule/review — the manager approves or rejects shift requests.
// Body: { ids: string[], action: 'APPROVE' | 'REJECT' }
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const parsed = ReviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError('Yêu cầu không hợp lệ: thiếu ca cần duyệt', 400);
    }

    const targets = await prisma.scheduleAssignment.findMany({
      where: { id: { in: parsed.data.ids }, factoryId: session.factoryId },
      select: { shiftDate: true },
    });
    const factoryId = session.factoryId;
    const months = targets.map((item) => monthOf(toDateOnly(item.shiftDate)));
    const result = await prisma.$transaction(async (tx) => {
      // Holds the months until commit, so none of them is closed half-way through.
      await holdMonths(tx, factoryId, months);
      const locked = await rejectIfMonthLocked(factoryId, months, tx);
      if (locked) return locked;

      return tx.scheduleAssignment.updateMany({
        where: { id: { in: parsed.data.ids }, factoryId },
        data: {
          status: parsed.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          reviewedAt: new Date(),
        },
      });
    });
    if (result instanceof Response) return result;

    return apiSuccess({ updated: result.count });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/schedule/review]', error);
    return apiError('Không thể duyệt ca', 500);
  }
}
