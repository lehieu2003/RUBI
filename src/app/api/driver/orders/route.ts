import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaAuth } from '@/lib/db';
import { rateLimit, getIpFromRequest } from '@/lib/rate-limit';
import { requireRole } from '@/lib/auth/helpers';
import { vietnamDayRange } from '@/lib/vietnam-time';
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /api/driver/orders?date=YYYY-MM-DD
// Returns the authenticated driver's work for one day (today by default):
// every order still SHIPPING plus the orders DELIVERED that day
export async function GET(request: NextRequest) {
  try {
    const limit = await rateLimit(`driver-orders:${getIpFromRequest(request)}`, 60, 60 * 1000);
    if (!limit.success) {
      return apiError('Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút', 429);
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    const driver = await getSessionDriver();

    if (!driver) {
      return apiError('Tài khoản chưa được gắn với tài xế', 401);
    }

    // Get today's date range
    // One Vietnam calendar day (today unless `date` is given).
    const day = dateParam ? vietnamDayRange(dateParam) : vietnamDayRange();
    if (!day) {
      return apiError('Ngày không hợp lệ', 400);
    }

    const orders = await prisma.order.findMany({
      where: {
        factoryId: driver.factoryId,
        driverId: driver.id,
        OR: [
          // Still to deliver, whatever day the order was taken: an order
          // phoned in last night for this morning must not disappear.
          { status: 'SHIPPING', createdAt: { lt: day.end } },
          // Delivered that day. Orders marked delivered by the office carry
          // no deliveredAt, so those fall back to the day they were taken.
          { status: 'DELIVERED', deliveredAt: { gte: day.start, lt: day.end } },
          { status: 'DELIVERED', deliveredAt: null, createdAt: { gte: day.start, lt: day.end } },
        ],
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
    if (error instanceof Response) return error;
    console.error('[GET /api/driver/orders]', error);
    return apiError('Không thể tải danh sách đơn hàng', 500);
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
