import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

// PATCH /api/orders/[id]/status - Update order status (D-05)
// COMPLETED is intentionally not settable here: it is reached only through
// the settlement (đối soát) reconcile endpoint, which records actual
// quantities, debt ledger and inventory in one transaction.
const StatusSchema = z.object({
  status: z.enum(['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED']),
  cancellationReason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const session = await requireRole(['ADMIN', 'STAFF']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    // Explicit guard so callers get a meaningful message, not a schema error
    if ((body as { status?: string })?.status === 'COMPLETED') {
      return apiError('Đơn hoàn thành phải qua Đối soát (settlement)', 400);
    }

    const parsed = StatusSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Trạng thái không hợp lệ. Để hoàn thành đơn, hãy dùng màn Đối soát.', 400);
    }

    // Require cancellation reason when cancelling
    if (parsed.data.status === 'CANCELLED' && !parsed.data.cancellationReason) {
      return apiError('Vui lòng nhập lý do khi huỷ đơn', 400);
    }

    // Verify order belongs to current factory before updating
    const existing = await prisma.order.findFirst({
      where: { id, factoryId: session.factoryId },
    });
    if (!existing) {
      return apiError('Không tìm thấy đơn hàng', 404);
    }

    const order = await prisma.order.update({
      where: { id, factoryId: session.factoryId },
      data: {
        status: parsed.data.status,
        notes: parsed.data.cancellationReason
          ? `[HỦY: ${parsed.data.cancellationReason}]`
          : undefined,
      },
    });

    return apiSuccess(order);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[PATCH /api/orders/[id]/status]', error);
    return apiError('Cập nhật thất bại', 500);
  }
}
