import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SHIFTS = [
  'SLOT_00_03',
  'SLOT_03_06',
  'SLOT_06_09',
  'SLOT_09_12',
  'SLOT_12_15',
  'SLOT_15_18',
  'SLOT_18_21',
  'SLOT_21_24',
] as const;

const ShiftAssignmentSchema = z.object({
  userId: z.string().min(1),
  shift: z.enum(SHIFTS).nullable(),
  removeShift: z.enum(SHIFTS).optional(),
  shiftDate: z.string().regex(DATE_ONLY_PATTERN),
});

function parseDateOnly(value: string | null): Date | null {
  if (!value || !DATE_ONLY_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

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
      return apiError('Bad Request: factoryId not found', 400);
    }
    if (!(await ensureFactoryExists(session.factoryId))) {
      return apiError('Factory mapping is invalid. Please relink this account to a valid factory.', 409);
    }

    const { searchParams } = new URL(request.url);
    const weekStart = parseDateOnly(searchParams.get('week'));
    if (!weekStart) {
      return apiError('Invalid week. Expected YYYY-MM-DD', 400);
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
        shiftDate: assignment.shiftDate.toISOString().slice(0, 10),
        shift: assignment.shift,
      })),
    })));
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/schedule/assignments]', error);
    return apiError('Schedule fetch failed', 500);
  }
}

async function handleSaveAssignment(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }
    if (!(await ensureFactoryExists(session.factoryId))) {
      return apiError('Factory mapping is invalid. Please relink this account to a valid factory.', 409);
    }

    const body = await request.json();
    const parsed = ShiftAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Invalid request. Required: userId, shift, shiftDate', 400);
    }

    const { userId, shift, removeShift } = parsed.data;
    const shiftDate = parseDateOnly(parsed.data.shiftDate);
    if (!shiftDate) {
      return apiError('Invalid shiftDate. Expected YYYY-MM-DD', 400);
    }

    const person = await prisma.user.findFirst({
      where: {
        id: userId,
        factoryId: session.factoryId,
        isActive: true,
        role: { in: ['STAFF', 'DRIVER'] },
      },
      select: { id: true, role: true },
    });
    if (!person) {
      return apiError('Staff or driver not found', 404);
    }

    if (shift === null) {
      const shiftToRemove = removeShift;
      if (shiftToRemove) {
        await prisma.scheduleAssignment.deleteMany({
          where: { factoryId: session.factoryId, userId, shiftDate, shift: shiftToRemove },
        });
      } else {
        await prisma.scheduleAssignment.deleteMany({
          where: { factoryId: session.factoryId, userId, shiftDate },
        });
      }
      return apiSuccess({
        success: true,
        assignment: { userId, shift: null, removeShift: shiftToRemove, shiftDate: parsed.data.shiftDate },
      });
    }

    const assignment = await prisma.scheduleAssignment.upsert({
      where: { userId_shiftDate_shift: { userId, shiftDate, shift } },
      create: {
        factoryId: session.factoryId,
        userId,
        shiftDate,
        shift,
      },
      update: { shift, factoryId: session.factoryId },
    });

    return apiSuccess({
      success: true,
      assignment: {
        userId: assignment.userId,
        shift: assignment.shift,
        shiftDate: assignment.shiftDate.toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[SAVE /api/schedule/assignments]', error);
    return apiError('Schedule update failed', 500);
  }
}

export async function POST(request: NextRequest) {
  return handleSaveAssignment(request);
}

export async function PATCH(request: NextRequest) {
  return handleSaveAssignment(request);
}
