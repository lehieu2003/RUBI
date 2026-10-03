import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';
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
    const session = await requireRole(['ADMIN', 'ACCOUNTANT']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const body = await request.json();
    const parsed = BulkAssignSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Invalid request. Required: orderIds (string[]) and driverId (string)', 400);
    }

    const { orderIds, driverId } = parsed.data;

    // Verify driver exists
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, factoryId: session.factoryId },
    });

    if (!driver) {
      return apiError('Driver not found', 404);
    }

    // SUB-01: Check subscription is active (read-only mode if not)
    const subscription = await prisma.subscription.findFirst({
      where: { factoryId: session.factoryId },
      orderBy: { createdAt: 'desc' },
    });

    // SUB-03: Check driverCount subscription limit
    // 1 admin free, paid drivers counted against subscription.driverCount
    const maxDrivers = 1 + (subscription?.driverCount ?? 0);
    const currentDriverCount = await prisma.driver.count({
      where: { factoryId: session.factoryId, isActive: true },
    });
    if (currentDriverCount >= maxDrivers) {
      return apiError('Cần nâng cấp subscription để thêm driver', 403);
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
    return apiError('Bulk assign failed', 500);
  }
}
