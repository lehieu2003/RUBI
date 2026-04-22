import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';

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
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = BulkAssignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request. Required: orderIds (string[]) and driverId (string)' },
        { status: 400 }
      );
    }

    const { orderIds, driverId } = parsed.data;

    // Verify driver exists
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, factoryId: session.factoryId },
    });

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
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
      return NextResponse.json(
        { error: 'Cần nâng cấp subscription để thêm driver', code: 'DRIVER_LIMIT_EXCEEDED' },
        { status: 403 }
      );
    }

    // Bulk update orders to assign to driver
    // Only updates orders that are in SHIPPING status (driver loaded, ready for delivery)
    const result = await prisma.order.updateMany({
      where: {
        factoryId: session.factoryId,
        id: { in: orderIds },
        status: 'SHIPPING', // Only assign to SHIPPING orders
      },
      data: {
        driverId: driverId,
      },
    });

    return NextResponse.json({
      success: true,
      assignedCount: result.count,
      driver: { id: driver.id, name: driver.name },
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[PATCH /api/orders/bulk-assign]', error);
    return NextResponse.json({ error: 'Bulk assign failed' }, { status: 500 });
  }
}
