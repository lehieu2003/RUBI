import { NextRequest, NextResponse } from 'next/server';
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
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      drivers: {
        where: { isActive: true },
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!factory) {
    return NextResponse.json({ error: 'Factory not found' }, { status: 404 });
  }

  const subscription = factory.subscriptions[0] ?? null;

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
    .filter(s => ['PENDING', 'SHIPPING'].includes(s.status))
    .reduce((acc, s) => acc + s._count, 0);

  const recentPayments = await basePrisma.payment.findMany({
    where: { factoryId },
    include: {
      admin: {
        select: { name: true },
      },
    },
    orderBy: { confirmedAt: 'desc' },
    take: 5,
  });

  const recentOrders = await basePrisma.order.findMany({
    where: {
      factoryId,
      createdAt: { gte: thirtyDaysAgo },
    },
    include: {
      customer: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const lastPaymentAt = recentPayments[0]?.confirmedAt?.toISOString() ?? null;

  return NextResponse.json({
    factory: {
      id: factory.id,
      name: factory.name,
      phone: factory.phone,
      address: factory.address,
      createdAt: factory.createdAt.toISOString(),
    },
    subscription: subscription
      ? {
          id: subscription.id,
          planType: subscription.planType,
          status: subscription.status,
          startDate: subscription.startDate.toISOString(),
          endDate: subscription.endDate.toISOString(),
          driverCount: subscription.driverCount,
          pricePerDriver: subscription.pricePerDriver ? Number(subscription.pricePerDriver) : null,
        }
      : null,
    activeDriverCount: factory.drivers.length,
    usersCount: factory.users.length,
    staffCount: factory.users.filter(user => user.role !== 'ADMIN').length,
    monthlyAmount: getMonthlyAmount(subscription),
    daysRemaining: getDaysRemaining(subscription?.endDate ?? null),
    lastPaymentAt,
    totalOrders,
    pendingOrders,
    recentPayments: recentPayments.map(payment => ({
      id: payment.id,
      amount: Number(payment.amount),
      confirmedAt: payment.confirmedAt.toISOString(),
      adminName: payment.admin.name,
      notes: payment.notes,
    })),
    recentOrders: recentOrders.map(order => ({
      id: order.id,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      customerName: order.customer.name,
    })),
    users: factory.users.map(user => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  _request: NextRequest,
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
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!factory) {
    return NextResponse.json({ error: 'Factory not found' }, { status: 404 });
  }

  if (factory.subscriptions[0]) {
    return NextResponse.json({ subscription: factory.subscriptions[0] });
  }

  const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const subscription = await basePrisma.subscription.create({
    data: {
      factoryId,
      planType: 'TRIAL',
      startDate: new Date(),
      endDate: trialEndDate,
      status: 'ACTIVE',
      driverCount: 0,
      pricePerDriver: null,
    },
  });

  return NextResponse.json({ subscription }, { status: 201 });
}
