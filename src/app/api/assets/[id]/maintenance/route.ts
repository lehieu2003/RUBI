import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /api/assets/[id]/maintenance — history, newest first
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(['ADMIN', 'ACCOUNTANT']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
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
    if (error instanceof Response) throw error;
    console.error('[GET /api/assets/[id]/maintenance]', error);
    return apiError('Failed to fetch maintenance records', 500);
  }
}

const CreateRecordSchema = z.object({
  type: z.enum(['ROUTINE', 'INSPECTION', 'INSURANCE', 'REPAIR']),
  performedAt: z.string().datetime().or(z.string().min(10)),
  dueAt: z.string().datetime().or(z.string().min(10)).nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// POST /api/assets/[id]/maintenance — record maintenance/inspection/insurance/repair
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(['ADMIN', 'ACCOUNTANT']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
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
      return apiError('Dữ liệu bảo trì không hợp lệ (cần performedAt)', 400);
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
    if (error instanceof Response) throw error;
    console.error('[POST /api/assets/[id]/maintenance]', error);
    return apiError('Failed to create maintenance record', 500);
  }
}
