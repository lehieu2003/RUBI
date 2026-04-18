import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const basePrisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ factoryId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { factoryId } = await params;

  const factory = await basePrisma.factory.findUnique({
    where: { id: factoryId },
    include: {
      subscription: true,
      drivers: {
        where: { isActive: true },
      },
    },
  });

  if (!factory) {
    return NextResponse.json({ error: 'Factory not found' }, { status: 404 });
  }

  // Get order stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const orderStats = await basePrisma.order.groupBy({
    by: ['status'],
    where: {
      factoryId,
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: true,
  });

  const totalOrders = orderStats.reduce((acc, s) => acc + s._count, 0);
  const pendingOrders = orderStats
    .filter(s => ['PENDING', 'CONFIRMED', 'PRINTED', 'SHIPPING'].includes(s.status))
    .reduce((acc, s) => acc + s._count, 0);

  return NextResponse.json({
    factory: {
      id: factory.id,
      name: factory.name,
      phone: factory.phone,
      address: factory.address,
      createdAt: factory.createdAt.toISOString(),
    },
    subscription: factory.subscription
      ? {
          id: factory.subscription.id,
          planType: factory.subscription.planType,
          status: factory.subscription.status,
          startDate: factory.subscription.startDate.toISOString(),
          endDate: factory.subscription.endDate.toISOString(),
          driverCount: factory.subscription.driverCount,
          pricePerDriver: Number(factory.subscription.pricePerDriver),
        }
      : null,
    activeDriverCount: factory.drivers.length,
    totalOrders,
    pendingOrders,
  });
}