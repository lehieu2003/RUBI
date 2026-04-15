import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// PATCH /api/orders/[id]/status - Update order status (D-05)
// Valid transitions: DRAFT -> CONFIRMED -> PRINTED -> DELIVERED
const StatusSchema = z.object({
  status: z.enum(['DRAFT', 'CONFIRMED', 'PRINTED', 'DELIVERED']),
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
        { error: 'Invalid status. Must be DRAFT, CONFIRMED, PRINTED, or DELIVERED' },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('[PATCH /api/orders/[id]/status]', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}