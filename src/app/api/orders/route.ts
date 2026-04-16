import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/orders - List orders with filters (D-06)
// Supports: customerId, status, date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const where: Record<string, unknown> = {};

    if (customerId) where.customerId = customerId;
    if (status) {
      const validStatuses = ['PENDING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
      if (validStatuses.includes(status)) {
        where.status = status as 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
      }
    }
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        orderItems: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Serialize Decimals to numbers for client compatibility
    const serialized = orders.map((order) => ({
      ...order,
      total: order.total.toNumber(),
      orderItems: order.orderItems.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toNumber(),
        lineTotal: item.lineTotal.toNumber(),
      })),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('[GET /api/orders]', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}