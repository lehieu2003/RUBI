import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prismaAuth } from '@/lib/db';

const basePrisma = prismaAuth;

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get first day of current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // activeFactoryCount: COUNT factories WHERE isSystem=false AND has ACTIVE subscription
  const activeFactoryCount = await basePrisma.factory.count({
    where: {
      isSystem: false,
      subscriptions: {
        some: {
          status: 'ACTIVE',
        },
      },
    },
  });

  // activeDriverCount: COUNT drivers WHERE isActive=true AND factory.isSystem=false
  const activeDriverCount = await basePrisma.driver.count({
    where: {
      isActive: true,
      factory: {
        isSystem: false,
      },
    },
  });

  // monthlyRevenue: SUM(subscription.driverCount * subscription.pricePerDriver)
  // for ACTIVE subscriptions with endDate >= first day of current month
  // Since we can't do arithmetic in Prisma easily, fetch subscriptions and compute
  const subscriptions = await basePrisma.subscription.findMany({
    select: {
      driverCount: true,
      pricePerDriver: true,
    },
    where: {
      status: 'ACTIVE',
      endDate: {
        gte: firstDayOfMonth,
      },
    },
  });

  const monthlyRevenue = subscriptions.reduce((sum, sub) => {
    const price = sub.pricePerDriver ? Number(sub.pricePerDriver) : 0;
    return sum + sub.driverCount * price;
  }, 0);

  return NextResponse.json({
    activeFactoryCount,
    activeDriverCount,
    monthlyRevenue,
  });
}
