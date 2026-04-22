import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prismaAuth } from '@/lib/db';

const basePrisma = prismaAuth;

function getDaysRemaining(endDate: Date | null): number | null {
  if (!endDate) return null;
  return Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getMonthlyAmount(subscription: { driverCount: number; pricePerDriver: unknown } | null) {
  if (!subscription) return 0;
  const price = subscription.pricePerDriver ? Number(subscription.pricePerDriver) : 0;
  return Math.max(0, subscription.driverCount - 1) * price;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const factories = await basePrisma.factory.findMany({
    where: { isSystem: false },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      payments: {
        orderBy: { confirmedAt: 'desc' },
        take: 1,
      },
      _count: {
        select: { drivers: { where: { isActive: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to include current subscription and driver count
  const result = factories.map(f => {
    const subscription = f.subscriptions[0] ?? null;
    return {
      id: f.id,
      name: f.name,
      phone: f.phone,
      address: f.address,
      createdAt: f.createdAt,
      subscription: subscription
        ? {
            ...subscription,
            pricePerDriver: subscription.pricePerDriver ? Number(subscription.pricePerDriver) : null,
          }
        : null,
      activeDriverCount: f._count.drivers,
      monthlyAmount: getMonthlyAmount(subscription),
      daysRemaining: getDaysRemaining(subscription?.endDate ?? null),
      lastPaymentAt: f.payments[0]?.confirmedAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ factories: result });
}
