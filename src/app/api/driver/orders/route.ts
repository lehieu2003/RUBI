import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaAuth } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /api/driver/orders?token=xxx&date=YYYY-MM-DD
// Returns orders for authenticated driver filtered by today's date
// Orders visible when status IN (SHIPPING, DELIVERED)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const dateParam = searchParams.get('date');

    const driver = token
      ? await prismaAuth.driver.findUnique({ where: { token } })
      : await getSessionDriver();

    if (!driver) {
      return apiError(token ? 'Invalid token' : 'Driver profile not found', 401);
    }

    // Get today's date range
    const date = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch orders for this driver with SHIPPING or DELIVERED status
    const orders = await prisma.order.findMany({
      where: {
        factoryId: driver.factoryId,
        driverId: driver.id,
        status: { in: ['SHIPPING', 'DELIVERED'] },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        customer: true,
        orderItems: { include: { product: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Serialize Decimals and add driver name to response
    const serialized = orders.map((order) => ({
      ...order,
      total: order.total.toNumber(),
      orderItems: order.orderItems.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toNumber(),
        lineTotal: item.lineTotal.toNumber(),
      })),
      driverName: driver.name, // Include driver name for display
    }));

    return apiSuccess({
          driver: { id: driver.id, name: driver.name },
          orders: serialized,
        });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[GET /api/driver/orders]', error);
    return apiError('Failed to fetch orders', 500);
  }
}

async function getSessionDriver() {
  const session = await requireRole(['DRIVER']);
  if (!session.factoryId) return null;

  return prismaAuth.driver.findFirst({
    where: {
      userId: session.userId,
      factoryId: session.factoryId,
      isActive: true,
      user: { role: 'DRIVER', isActive: true },
    },
  });
}
