import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { getSession } from '@/lib/auth';

// PATCH /api/orders/[id]/status - Update order status (D-05)
// Valid statuses: PENDING, SHIPPING, DELIVERED, COMPLETED, CANCELLED
const StatusSchema = z.object({
  status: z.enum(['PENDING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED']),
  cancellationReason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }
    if (session.role !== 'ACCOUNTANT' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = StatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid status. Must be PENDING, SHIPPING, DELIVERED, COMPLETED, or CANCELLED' },
        { status: 400 }
      );
    }

    // Require cancellation reason when cancelling
    if (parsed.data.status === 'CANCELLED' && !parsed.data.cancellationReason) {
      return NextResponse.json(
        { error: 'Cancellation reason is required when cancelling an order' },
        { status: 400 }
      );
    }

    // Verify order belongs to current factory before updating
    const existing = await prisma.order.findFirst({
      where: { id, factoryId: session.factoryId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Order not found or access denied' }, { status: 404 });
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

    return NextResponse.json(order);
  } catch (error) {
    console.error('[PATCH /api/orders/[id]/status]', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
