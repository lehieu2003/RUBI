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

    const session = await requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    // Explicit guard so callers get a meaningful message, not a schema error
    if ((body as { status?: string })?.status === 'COMPLETED') {
      return apiError('Đơn hoàn thành phải qua Đối soát (settlement)', 400);
    }

    const parsed = StatusSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Invalid status. Must be PENDING, SHIPPING, DELIVERED, or CANCELLED. Use settlement (Đối soát) to complete an order', 400);
    }

    // Require cancellation reason when cancelling
    if (parsed.data.status === 'CANCELLED' && !parsed.data.cancellationReason) {
      return apiError('Cancellation reason is required when cancelling an order', 400);
    }

    // Verify order belongs to current factory before updating
    const existing = await prisma.order.findFirst({
      where: { id, factoryId: session.factoryId },
    });
    if (!existing) {
      return apiError('Order not found or access denied', 404);
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
    return apiError('Update failed', 500);
  }
}
