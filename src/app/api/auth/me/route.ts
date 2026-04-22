import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getFactorySubscription, getDaysRemaining } from '@/lib/subscription-status';

// Use basePrisma for global user lookups (no tenant filtering)
import { prisma as basePrisma } from '@/lib/db';
const prismaAuth = basePrisma;

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ user: null, subscription: null }, { status: 401 });
  }

  const user = await prismaAuth.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!user) {
    return NextResponse.json({ user: null, subscription: null }, { status: 401 });
  }

  // Get subscription status for this factory
  const subscription = session.factoryId
    ? await getFactorySubscription(session.factoryId)
    : null;

  const daysRemaining = getDaysRemaining(subscription);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      factoryId: session.factoryId,
    },
    subscription: subscription ? {
      id: subscription.id,
      planType: subscription.planType,
      status: subscription.status,
      startDate: subscription.startDate.toISOString(),
      endDate: subscription.endDate.toISOString(),
      driverCount: subscription.driverCount,
      daysRemaining,
    } : null,
  });
}
