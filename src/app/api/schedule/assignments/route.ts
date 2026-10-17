import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { DATE_ONLY_PATTERN, SHIFTS, addDays, monthOf, parseDateOnly } from '@/lib/schedule';
import { holdMonths, rejectIfMonthLocked } from '@/lib/payroll-lock';
import { apiSuccess, apiError } from "@/lib/api-response";

const ShiftAssignmentSchema = z.object({
  userId: z.string().min(1),
  shift: z.enum(SHIFTS).nullable(),
  removeShift: z.enum(SHIFTS).optional(),
  shiftDate: z.string().regex(DATE_ONLY_PATTERN),
});

async function ensureFactoryExists(factoryId: string): Promise<boolean> {
  const factory = await prisma.factory.findUnique({
    where: { id: factoryId },
    select: { id: true },
  });
  return Boolean(factory);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }
    if (!(await ensureFactoryExists(session.factoryId))) {
      return apiError('Tài khoản đang gắn với nhà máy không tồn tại. Vui lòng liên hệ Quản lý.', 409);
    }

    const { searchParams } = new URL(request.url);
    const weekStart = parseDateOnly(searchParams.get('week'));
    if (!weekStart) {
      return apiError('Tuần không hợp lệ', 400);
    }

    const weekEnd = addDays(weekStart, 7);
    const people = await prisma.user.findMany({
      where: {
        factoryId: session.factoryId,
        isActive: true,
        role: { in: ['STAFF', 'DRIVER'] },
      },
      include: {
        scheduleAssignments: {
          where: {
            factoryId: session.factoryId,
            shiftDate: { gte: weekStart, lt: weekEnd },
          },
          orderBy: { shiftDate: 'asc' },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    return apiSuccess(people.map((person) => ({
      id: person.id,
      name: person.name,
      role: person.role,
      shifts: person.scheduleAssignments.map((assignment) => ({
        id: assignment.id,
        shiftDate: assignment.shiftDate.toISOString().slice(0, 10),
        shift: assignment.shift,
        status: assignment.status,
      })),
    })));
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/schedule/assignments]', error);
    return apiError('Không thể tải lịch làm', 500);
  }
}

async function handleSaveAssignment(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }
    if (!(await ensureFactoryExists(session.factoryId))) {
      return apiError('Tài khoản đang gắn với nhà máy không tồn tại. Vui lòng liên hệ Quản lý.', 409);
    }

    const body = await request.json();
    const parsed = ShiftAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Yêu cầu không hợp lệ: thiếu người, ca hoặc ngày làm', 400);
    }

    const { userId, shift, removeShift } = parsed.data;
    const shiftDate = parseDateOnly(parsed.data.shiftDate);
    if (!shiftDate) {
      return apiError('Ngày làm không hợp lệ', 400);
    }

    const factoryId = session.factoryId;
    const month = monthOf(parsed.data.shiftDate);
    return await prisma.$transaction(async (tx) => {
      // Holds the month until commit, so it cannot be closed half-way through.
      await holdMonths(tx, factoryId, [month]);
      const locked = await rejectIfMonthLocked(factoryId, [month], tx);
      if (locked) return locked;

      const person = await tx.user.findFirst({
        where: {
          id: userId,
          factoryId,
          isActive: true,
          role: { in: ['STAFF', 'DRIVER'] },
        },
        select: { id: true, role: true },
      });
      if (!person) {
        return apiError('Không tìm thấy nhân viên hoặc tài xế', 404);
      }

      if (shift === null) {
        const shiftToRemove = removeShift;
        if (shiftToRemove) {
          await tx.scheduleAssignment.deleteMany({
            where: { factoryId, userId, shiftDate, shift: shiftToRemove },
          });
        } else {
          await tx.scheduleAssignment.deleteMany({
            where: { factoryId, userId, shiftDate },
          });
        }
        return apiSuccess({
          success: true,
          assignment: { userId, shift: null, removeShift: shiftToRemove, shiftDate: parsed.data.shiftDate },
        });
      }

      // A shift assigned by the manager is approved by definition; assigning
      // someone who had a pending or rejected request approves it.
      const reviewedAt = new Date();
      const assignment = await tx.scheduleAssignment.upsert({
        where: { userId_shiftDate_shift: { userId, shiftDate, shift } },
        create: {
          factoryId,
          userId,
          shiftDate,
          shift,
          status: 'APPROVED',
          reviewedAt,
        },
        update: { shift, factoryId, status: 'APPROVED', reviewedAt },
      });

      return apiSuccess({
        success: true,
        assignment: {
          id: assignment.id,
          userId: assignment.userId,
          shift: assignment.shift,
          shiftDate: assignment.shiftDate.toISOString().slice(0, 10),
          status: assignment.status,
        },
      });
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[SAVE /api/schedule/assignments]', error);
    return apiError('Không thể cập nhật lịch làm', 500);
  }
}

export async function POST(request: NextRequest) {
  return handleSaveAssignment(request);
}

export async function PATCH(request: NextRequest) {
  return handleSaveAssignment(request);
}
