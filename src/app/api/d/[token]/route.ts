import { NextRequest, NextResponse } from 'next/server';
import { prismaAuth } from '@/lib/db';
import { rateLimit, getIpFromRequest } from '@/lib/rate-limit';

// GET /api/d/[token] - Public driver share-link payload (no login).
// Backs /d/[token]: the client reads { orders, driverName } at top level,
// so this route intentionally does NOT use the standard envelope.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Public endpoint: throttle per IP so leaked/shared links can't be scraped
    const limit = await rateLimit(`driver-link:${getIpFromRequest(request)}`, 30, 60 * 1000);
    if (!limit.success) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
    }

    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
    }

    const driver = await prismaAuth.driver.findUnique({
      where: { token },
    });
    if (!driver || !driver.isActive) {
      return NextResponse.json(
        { error: 'Link không hợp lệ hoặc đã hết hạn' },
        { status: 404 }
      );
    }

    const date = new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await prismaAuth.order.findMany({
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

    const serialized = orders.map((order) => ({
      id: order.id,
      status: order.status,
      total: order.total.toNumber(),
      customer: {
        id: order.customer.id,
        code: order.customer.code,
        name: order.customer.name,
        address: order.customer.address,
        phone: order.customer.phone,
      },
      orderItems: order.orderItems.map((item) => ({
        quantity: item.quantity,
        product: {
          name: item.product.name,
          sizeKg: item.product.sizeKg,
        },
      })),
    }));

    return NextResponse.json({ orders: serialized, driverName: driver.name });
  } catch (error) {
    console.error('[GET /api/d/[token]]', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
