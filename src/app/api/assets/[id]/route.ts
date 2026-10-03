import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

const UpdateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  licensePlate: z.string().nullable().optional(),
  capacityTons: z.number().positive().nullable().optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'BROKEN', 'INACTIVE']).optional(),
  notes: z.string().nullable().optional(),
});

// PATCH /api/assets/[id] — update asset fields (ADMIN, ACCOUNTANT)
export async function PATCH(
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
    const body = await request.json();
    const parsed = UpdateAssetSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Dữ liệu cập nhật không hợp lệ', 400);
    }

    const existing = await prisma.asset.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true },
    });
    if (!existing) {
      return apiError('Không tìm thấy tài sản', 404);
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: parsed.data,
    });

    return apiSuccess(asset);
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[PATCH /api/assets/[id]]', error);
    return apiError('Failed to update asset', 500);
  }
}

// DELETE /api/assets/[id] — hard delete with cascade (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const { id } = await params;
    const existing = await prisma.asset.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true },
    });
    if (!existing) {
      return apiError('Không tìm thấy tài sản', 404);
    }

    await prisma.asset.delete({ where: { id } });

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[DELETE /api/assets/[id]]', error);
    return apiError('Failed to delete asset', 500);
  }
}
