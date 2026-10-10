import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/helpers';
import { vietnamDayRange } from '@/lib/vietnam-time';
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /api/assets/[id]/maintenance — history, newest first
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const { id } = await params;
    const asset = await prisma.asset.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true },
    });
    if (!asset) {
      return apiError('Không tìm thấy tài sản', 404);
    }

    const records = await prisma.maintenanceRecord.findMany({
      where: { assetId: id, factoryId: session.factoryId },
      orderBy: { performedAt: 'desc' },
    });

    return apiSuccess(records);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/assets/[id]/maintenance]', error);
    return apiError('Không thể tải lịch sử bảo trì', 500);
  }
}

// A full ISO timestamp or a real calendar date (YYYY-MM-DD). Date alone is
// too lenient: it rolls 2026-02-31 over to March instead of refusing it.
const DateString = z
  .string()
  .datetime()
  .or(z.string().refine((value) => vietnamDayRange(value) !== null));

const CreateRecordSchema = z.object({
  type: z.enum(['ROUTINE', 'INSPECTION', 'INSURANCE', 'REPAIR']),
  performedAt: DateString,
  dueAt: DateString.nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// POST /api/assets/[id]/maintenance — record maintenance/inspection/insurance/repair
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const { id } = await params;
    const asset = await prisma.asset.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true },
    });
    if (!asset) {
      return apiError('Không tìm thấy tài sản', 404);
    }

    const body = await request.json();
    const parsed = CreateRecordSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Dữ liệu bảo trì không hợp lệ (cần performedAt là ngày hợp lệ)', 400);
    }

    const record = await prisma.maintenanceRecord.create({
      data: {
        factoryId: session.factoryId,
        assetId: id,
        type: parsed.data.type,
        performedAt: new Date(parsed.data.performedAt),
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
        cost: parsed.data.cost ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    return apiSuccess(record, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/assets/[id]/maintenance]', error);
    return apiError('Không thể lưu lần bảo trì', 500);
  }
}
