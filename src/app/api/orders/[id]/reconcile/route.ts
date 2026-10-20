import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { z } from 'zod';
import { changeStock } from '@/lib/inventory';
import { describeSettlement, dong, recordAudit } from '@/lib/audit';
import { apiSuccess, apiError } from "@/lib/api-response";
import { retryIfCancelled } from '@/lib/transactions';

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
    const rejection = await retryIfCancelled(() =>
      prisma.$transaction(
        async (tx) => {
          // 0. Fetch order within transaction scope for atomicity
          const order = await tx.order.findFirst({
            where: { id, factoryId: session.factoryId },
            include: { orderItems: { include: { product: { select: { name: true, sizeKg: true } } } }, customer: true },
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
          // ...and every line of the order is given exactly once, so the lines add
          // up to the total booked as debt.
          const sentItemIds = new Set(parsed.data.items.map((item) => item.id));
          if (sentItemIds.size !== parsed.data.items.length || sentItemIds.size !== ownItemIds.size) {
            return apiError('Dữ liệu không hợp lệ: cần số thực giao của mỗi dòng hàng, mỗi dòng một lần', 400);
          }

          // 1. Mark the order COMPLETED first. The status is checked again in the
          // write itself, so a second settlement, or an order cancelled in the
          // meantime, is rejected before any debt or stock is booked.
          const completed = await tx.order.updateMany({
            where: { id, factoryId: session.factoryId, status: 'DELIVERED' },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
          if (completed.count === 0) {
            return apiError('Chỉ đối soát được đơn đã giao', 409, 'ORDER_NOT_DELIVERED');
          }

          // 2. Record what was delivered: actualQty, and the line worth actualQty * unitPrice
          for (const item of parsed.data.items) {
            const orderItem = order.orderItems.find((oi) => oi.id === item.id)!;
            await tx.orderItem.update({
              where: { id: item.id },
              data: { actualQty: item.actualQty, lineTotal: orderItem.unitPrice.mul(item.actualQty) },
            });
          }

          // 3. Calculate delivered total from actualQty * unitPrice
          const deliveredTotal = parsed.data.items.reduce((sum, itemInput) => {
            const orderItem = order.orderItems.find(oi => oi.id === itemInput.id);
            if (!orderItem) return sum;
            return sum + (itemInput.actualQty * orderItem.unitPrice.toNumber());
          }, 0);

          // A settled order is worth what was delivered, the amount booked as debt below.
          await tx.order.update({ where: { id }, data: { total: deliveredTotal } });

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

          // 5. Deduct inventory for each product from the running balance
          for (const itemInput of parsed.data.items) {
            const orderItem = order.orderItems.find(oi => oi.id === itemInput.id);
            if (!orderItem || itemInput.actualQty === 0) continue;

            await changeStock(tx, orderItem.productId, { add: -itemInput.actualQty });
          }

          // 6. Log what was settled: the lines that differ from the order, and the debt
          const settledLines = parsed.data.items.flatMap((itemInput) => {
            const orderItem = order.orderItems.find((oi) => oi.id === itemInput.id);
            return orderItem
              ? [{ ...orderItem.product, ordered: orderItem.quantity, delivered: itemInput.actualQty }]
              : [];
          });
          await recordAudit(
            tx,
            { factoryId: order.factoryId, userId: session.userId, userName: session.name },
            {
              action: 'ORDER_SETTLED',
              orderId: order.id,
              customerId: order.customerId,
              summary: `Chốt đơn: ${describeSettlement(settledLines)}. Ghi nợ ${dong(deliveredTotal)}`,
            }
          );
          return null;
        },
        { isolationLevel: 'Serializable' }
      )
    );
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
