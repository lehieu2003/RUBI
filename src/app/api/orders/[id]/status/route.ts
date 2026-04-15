import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

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

    const order = await prisma.order.update({
      where: { id },
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