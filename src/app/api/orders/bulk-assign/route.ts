import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/helpers';
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
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const body = await request.json();
    const parsed = BulkAssignSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Yêu cầu không hợp lệ: thiếu đơn hàng hoặc tài xế', 400);
    }

    const { orderIds, driverId } = parsed.data;

    // Verify driver exists
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, factoryId: session.factoryId },
    });

    if (!driver) {
      return apiError('Không tìm thấy tài xế', 404);
    }

    // Bulk update orders to assign to driver.
    // The office workflow selects PENDING (Chờ giao) orders right after
    // taking them, or SHIPPING orders to reassign. Terminal states
    // (DELIVERED/COMPLETED/CANCELLED) must never be reassigned.
    const result = await prisma.order.updateMany({
      where: {
        factoryId: session.factoryId,
        id: { in: orderIds },
        status: { in: ['PENDING', 'SHIPPING'] },
      },
      data: {
        driverId: driverId,
      },
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
