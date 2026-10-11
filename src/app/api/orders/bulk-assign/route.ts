import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/helpers';
import type { Prisma } from '@prisma/client';
import { recordAudit } from '@/lib/audit';
import { apiSuccess, apiError } from "@/lib/api-response";

// PATCH /api/orders/bulk-assign
// Body: { orderIds: string[], driverId: string }
// Assigns multiple orders to a single driver
const BulkAssignSchema = z.object({
  orderIds: z.array(z.string()).min(1),
  driverId: z.string(),
});

export async function PATCH(request: NextRequest) {
  try {
    // Office staff take the order on the phone and hand it to a driver themselves.
    const session = await requireRole(['ADMIN', 'STAFF']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const body = await request.json();
    const parsed = BulkAssignSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Yêu cầu không hợp lệ: thiếu đơn hàng hoặc tài xế', 400);
    }

    const { orderIds, driverId } = parsed.data;

    // Verify driver exists and can still sign in to deliver
    const driver = await prisma.driver.findFirst({
      where: {
        id: driverId,
        factoryId: session.factoryId,
        isActive: true,
        user: { role: 'DRIVER', isActive: true },
      },
    });

    if (!driver) {
      return apiError('Không tìm thấy tài xế', 404);
    }

    // Bulk update orders to assign to driver.
    // The office workflow selects PENDING (Chờ giao) orders right after
    // taking them, or SHIPPING orders to reassign. Terminal states
    // (DELIVERED/COMPLETED/CANCELLED) must never be reassigned.
    const factoryId = session.factoryId;
    const result = await prisma.$transaction(async (tx) => {
      const where: Prisma.OrderWhereInput = { factoryId, id: { in: orderIds }, status: { in: ['PENDING', 'SHIPPING'] } };
      // Which orders are about to change hands, for the log.
      const assignable = await tx.order.findMany({ where, select: { id: true, customerId: true } });
      const updated = await tx.order.updateMany({
        where,
        data: {
          driverId: driverId,
        },
      });
      await recordAudit(
        tx,
        { factoryId, userId: session.userId, userName: session.name },
        assignable.map((order) => ({
          action: 'ORDER_ASSIGNED' as const,
          orderId: order.id,
          customerId: order.customerId,
          summary: `Giao cho tài xế ${driver.name}`,
        }))
      );
      return updated;
    });

    return apiSuccess({
          success: true,
          assignedCount: result.count,
          driver: { id: driver.id, name: driver.name },
        });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[PATCH /api/orders/bulk-assign]', error);
    return apiError('Không thể gán tài xế cho các đơn đã chọn', 500);
  }
}
