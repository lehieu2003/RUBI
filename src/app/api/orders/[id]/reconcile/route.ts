import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { z } from 'zod';
import { apiSuccess, apiError } from "@/lib/api-response";

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
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = ReconcileSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Dữ liệu không hợp lệ: thiếu số lượng thực giao', 400);
    }

    // --- Atomic transaction: reconcile + inventory deduction + debt entry ---
    const rejection = await prisma.$transaction(async (tx) => {
      // 0. Fetch order within transaction scope for atomicity
      const order = await tx.order.findFirst({
        where: { id, factoryId: session.factoryId },
        include: { orderItems: true, customer: true },
      });
      if (!order) {
        return apiError('Không tìm thấy đơn hàng', 404);
      }
      if (order.status !== 'DELIVERED') {
        return apiError('Chỉ đối soát được đơn đã giao', 409, 'ORDER_NOT_DELIVERED');
      }
      // Every line being settled must belong to this order.
      const ownItemIds = new Set(order.orderItems.map((item) => item.id));
      if (parsed.data.items.some((item) => !ownItemIds.has(item.id))) {
        return apiError('Dữ liệu không hợp lệ: có dòng hàng không thuộc đơn này', 400);
      }

      // 1. Update actualQty for each line item
      for (const item of parsed.data.items) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: { actualQty: item.actualQty },
        });
      }

      // 2. Update order status to COMPLETED
      await tx.order.update({
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
      return null;
    });
    if (rejection) return rejection;

    return apiSuccess({
          success: true,
          orderId: id,
          status: 'COMPLETED',
        });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[PATCH /api/orders/[id]/reconcile]', error);
    return apiError('Đối soát thất bại', 500);
  }
}
