import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const ReconcileSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    actualQty: z.number().int().min(0),
  })).min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // --- Session auth ---
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'ACCOUNTANT' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = ReconcileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body. Required: items[{id, actualQty}]' }, { status: 400 });
    }

    // --- Check order is DELIVERED ---
    const order = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: true, customer: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { error: `Order is ${order.status}, cannot reconcile. Only DELIVERED orders can be reconciled.` },
        { status: 409 }
      );
    }

    // --- Atomic transaction: reconcile + inventory deduction + debt entry ---
    await prisma.$transaction(async (tx) => {
      // 1. Update actualQty for each line item
      for (const item of parsed.data.items) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: { actualQty: item.actualQty },
        });
      }

      // 2. Update order status to COMPLETED
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });

      // 3. Calculate delivered total from actualQty * unitPrice
      const deliveredTotal = parsed.data.items.reduce((sum, itemInput) => {
        const orderItem = order.orderItems.find(oi => oi.id === itemInput.id);
        if (!orderItem) return sum;
        return sum + (itemInput.actualQty * orderItem.unitPrice.toNumber());
      }, 0);

      // 4. Create DEBT ledger entry
      if (deliveredTotal > 0) {
        await tx.customerDebtLedger.create({
          data: {
            customerId: order.customerId,
            type: 'DEBT',
            amount: deliveredTotal,
            notes: `Order ${order.id} delivered`,
          },
        });
      }

      // 5. Deduct inventory for each product (upsert daily record)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const itemInput of parsed.data.items) {
        const orderItem = order.orderItems.find(oi => oi.id === itemInput.id);
        if (!orderItem || itemInput.actualQty === 0) continue;

        await tx.inventory.upsert({
          where: {
            productId_date: { productId: orderItem.productId, date: today },
          },
          create: {
            productId: orderItem.productId,
            date: today,
            quantityOnHand: -itemInput.actualQty, // Negative = deduction from stock
          },
          update: {
            quantityOnHand: { decrement: itemInput.actualQty },
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      orderId: id,
      status: 'COMPLETED',
    });
  } catch (error) {
    console.error('[PATCH /api/orders/[id]/reconcile]', error);
    return NextResponse.json({ error: 'Reconciliation failed' }, { status: 500 });
  }
}