import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prismaAuth } from '@/lib/db';
import { apiSuccess, apiError } from "@/lib/api-response";

const basePrisma = prismaAuth;

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return apiError('Forbidden', 403);
  }

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const factories = await basePrisma.factory.findMany({
    where: { isSystem: false },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const activeDriverCount = await basePrisma.driver.count({
    where: {
      isActive: true,
      factory: {
        isSystem: false,
      },
    },
  });

  const monthlyPayments = await basePrisma.payment.findMany({
    where: {
      confirmedAt: { gte: firstDayOfMonth },
      factory: { isSystem: false },
    },
    select: { amount: true },
  });

  const latestSubscriptions = factories.map(factory => factory.subscriptions[0]).filter(Boolean);
  const activeSubscriptions = latestSubscriptions.filter(
    subscription => subscription.status === 'ACTIVE' && subscription.endDate >= now
  );
  const trialSubscriptions = latestSubscriptions.filter(
    subscription => subscription.planType === 'TRIAL' && subscription.status === 'ACTIVE'
  );
  const expiredSubscriptions = latestSubscriptions.filter(
    subscription => subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED' || subscription.endDate < now
  );
  const nearExpirySubscriptions = activeSubscriptions.filter(
    subscription => subscription.endDate <= sevenDaysFromNow
  );

  const monthlyRevenue = activeSubscriptions.reduce((sum, subscription) => {
    const price = subscription.pricePerDriver ? Number(subscription.pricePerDriver) : 0;
    const chargeableDrivers = Math.max(0, subscription.driverCount - 1);
    return sum + chargeableDrivers * price;
  }, 0);

  const monthlyPaymentTotal = monthlyPayments.reduce((sum, payment) => {
    return sum + Number(payment.amount);
  }, 0);

  return apiSuccess({
      totalFactoryCount: factories.length,
      activeFactoryCount: activeSubscriptions.length,
      trialFactoryCount: trialSubscriptions.length,
      expiredFactoryCount: expiredSubscriptions.length,
      activeDriverCount,
      monthlyRevenue,
      monthlyPaymentTotal,
      nearExpiryCount: nearExpirySubscriptions.length,
    });
}
