import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { DATE_ONLY_PATTERN, SHIFTS, addDays, parseDateOnly, toDateOnly, todayInVietnam } from '@/lib/schedule';
import { apiSuccess, apiError } from '@/lib/api-response';

// Self-service shift registration for STAFF and DRIVER.
// A requested shift is PENDING until the manager approves it; only
// approved shifts count towards the monthly shift report.

const ShiftRequestSchema = z.object({
  shiftDate: z.string().regex(DATE_ONLY_PATTERN),
  shift: z.enum(SHIFTS),
});

// GET /api/schedule/my?week=YYYY-MM-DD — the whole team's week, so people
// can agree on shifts among themselves. Other people's rejected requests
// are hidden.
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['STAFF', 'DRIVER']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const weekStart = parseDateOnly(new URL(request.url).searchParams.get('week'));
    if (!weekStart) {
      return apiError('Tuần không hợp lệ', 400);
    }

    const people = await prisma.user.findMany({
      where: { factoryId: session.factoryId, isActive: true, role: { in: ['STAFF', 'DRIVER'] } },
      select: {
        id: true,
        name: true,
        role: true,
        scheduleAssignments: {
          where: { factoryId: session.factoryId, shiftDate: { gte: weekStart, lt: addDays(weekStart, 7) } },
          select: { shiftDate: true, shift: true, status: true },
          orderBy: { shiftDate: 'asc' },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    return apiSuccess({
      userId: session.userId,
      today: todayInVietnam(),
      people: people.map((person) => ({
        id: person.id,
        name: person.name,
        role: person.role,
        shifts: person.scheduleAssignments
          .filter((item) => person.id === session.userId || item.status !== 'REJECTED')
          .map((item) => ({ shiftDate: toDateOnly(item.shiftDate), shift: item.shift, status: item.status })),
      })),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/schedule/my]', error);
    return apiError('Không thể tải lịch làm', 500);
  }
}

async function parseOwnShift(request: NextRequest) {
  const session = await requireRole(['STAFF', 'DRIVER']);
  if (!session.factoryId) {
    return { error: apiError('Tài khoản chưa được gán nhà máy', 400) } as const;
  }
  const parsed = ShiftRequestSchema.safeParse(await request.json().catch(() => null));
  const shiftDate = parsed.success ? parseDateOnly(parsed.data.shiftDate) : null;
  if (!parsed.success || !shiftDate) {
    return { error: apiError('Yêu cầu không hợp lệ: thiếu ngày hoặc ca làm', 400) } as const;
  }
  if (parsed.data.shiftDate < todayInVietnam()) {
    return { error: apiError('Không thể thay đổi ca của ngày đã qua', 400) } as const;
  }
  return { session, factoryId: session.factoryId, shiftDate, shift: parsed.data.shift, date: parsed.data.shiftDate } as const;
}

// POST /api/schedule/my — request a shift for yourself (creates it as PENDING)
export async function POST(request: NextRequest) {
  try {
    const input = await parseOwnShift(request);
    if ('error' in input) return input.error;
    const { session, factoryId, shiftDate, shift, date } = input;

    const key = { userId_shiftDate_shift: { userId: session.userId, shiftDate, shift } };
    const existing = await prisma.scheduleAssignment.findFirst({
      where: { factoryId, userId: session.userId, shiftDate, shift },
    });

    // Already requested or approved: nothing to do. A rejected request can be sent again.
    const assignment =
      existing && existing.status !== 'REJECTED'
        ? existing
        : await prisma.scheduleAssignment.upsert({
            where: key,
            create: { factoryId, userId: session.userId, shiftDate, shift, status: 'PENDING' },
            update: { status: 'PENDING', reviewedAt: null },
          });

    return apiSuccess({ shift: { shiftDate: date, shift, status: assignment.status } });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/schedule/my]', error);
    return apiError('Không thể cập nhật lịch làm', 500);
  }
}

// DELETE /api/schedule/my — withdraw your own request. An approved shift
// can only be changed by the manager.
export async function DELETE(request: NextRequest) {
  try {
    const input = await parseOwnShift(request);
    if ('error' in input) return input.error;
    const { session, factoryId, shiftDate, shift } = input;

    const existing = await prisma.scheduleAssignment.findFirst({
      where: { factoryId, userId: session.userId, shiftDate, shift },
    });
    if (existing?.status === 'APPROVED') {
      return apiError('Ca đã được duyệt. Liên hệ Quản lý để thay đổi.', 409);
    }
    await prisma.scheduleAssignment.deleteMany({
      where: { factoryId, userId: session.userId, shiftDate, shift, status: { in: ['PENDING', 'REJECTED'] } },
    });
    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[DELETE /api/schedule/my]', error);
    return apiError('Không thể cập nhật lịch làm', 500);
  }
}
