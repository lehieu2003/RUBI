import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { SHIFT_HOURS, toDateOnly } from '@/lib/schedule';
import { apiSuccess, apiError } from '@/lib/api-response';

// GET /api/reports/shifts?month=YYYY-MM — approved shifts per person for one
// month, used as the basis for payroll. Pending and rejected requests are
// reported separately and never counted.
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const month = new URL(request.url).searchParams.get('month') ?? '';
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!match) {
      return apiError('Tháng không hợp lệ', 400);
    }
    const monthStart = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
    const monthEnd = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1));

    // Start from the assignments, not from active users: someone who worked
    // this month and was deactivated later must still appear.
    const assignments = await prisma.scheduleAssignment.findMany({
      where: { factoryId: session.factoryId, shiftDate: { gte: monthStart, lt: monthEnd } },
      select: {
        shiftDate: true,
        shift: true,
        status: true,
        user: { select: { id: true, name: true, role: true, isActive: true } },
      },
      orderBy: [{ shiftDate: 'asc' }, { shift: 'asc' }],
    });

    type Row = {
      id: string;
      name: string;
      role: string;
      isActive: boolean;
      approvedShifts: number;
      pendingShifts: number;
      rejectedShifts: number;
      days: Record<string, string[]>;
    };
    const rows = new Map<string, Row>();

    for (const item of assignments) {
      const row =
        rows.get(item.user.id) ??
        { ...item.user, approvedShifts: 0, pendingShifts: 0, rejectedShifts: 0, days: {} };
      rows.set(item.user.id, row);

      if (item.status === 'APPROVED') {
        row.approvedShifts += 1;
        (row.days[toDateOnly(item.shiftDate)] ??= []).push(item.shift);
      } else if (item.status === 'PENDING') {
        row.pendingShifts += 1;
      } else {
        row.rejectedShifts += 1;
      }
    }

    const people = [...rows.values()]
      .map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role,
        isActive: row.isActive,
        approvedShifts: row.approvedShifts,
        hours: row.approvedShifts * SHIFT_HOURS,
        daysWorked: Object.keys(row.days).length,
        pendingShifts: row.pendingShifts,
        rejectedShifts: row.rejectedShifts,
        days: Object.entries(row.days).map(([date, shifts]) => ({ date, shifts })),
      }))
      .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name, 'vi'));

    return apiSuccess({ month, shiftHours: SHIFT_HOURS, people });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/reports/shifts]', error);
    return apiError('Không thể tải báo cáo', 500);
  }
}
