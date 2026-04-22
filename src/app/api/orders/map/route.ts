import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/orders/map?date=YYYY-MM-DD&driverId=xxx
// Returns all orders with GPS data for admin map
// Supports filtering by date and/or driver
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }
    if (session.role !== 'ACCOUNTANT' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const driverId = searchParams.get('driverId');

    // Build date range
    const date = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Build where clause
    const where: Record<string, unknown> = {
      factoryId: session.factoryId,
      status: { in: ['SHIPPING', 'DELIVERED'] },
      createdAt: { gte: startOfDay, lte: endOfDay },
      deliveryGps: { not: null }, // Only orders with GPS data
    };

    if (driverId) {
      where.driverId = driverId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        driver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Serialize for client
    const serialized = orders.map((order) => ({
      id: order.id,
      status: order.status,
      customerName: order.customer.name,
      customerAddress: order.customer.address,
      customerPhone: order.customer.phone,
      deliveryGps: order.deliveryGps, // Json field {lat, lng}
      driverName: order.driver?.name || null,
      driverId: order.driverId,
      createdAt: order.createdAt,
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('[GET /api/orders/map]', error);
    return NextResponse.json({ error: 'Failed to fetch map data' }, { status: 500 });
  }
}
