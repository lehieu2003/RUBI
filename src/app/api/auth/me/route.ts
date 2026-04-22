import { NextResponse } from 'next/server';
import { getSession, setSessionCookie, signJWT } from '@/lib/auth';
import { getDaysRemaining } from '@/lib/subscription-status';
import { getFactorySubscription } from '@/lib/subscription-queries';

// Use prismaAuth for global user lookups (no tenant filtering)
import { prismaAuth } from '@/lib/db';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ user: null, subscription: null }, { status: 401 });
  }

  const user = await prismaAuth.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, factoryId: true, isActive: true },
  });

  if (!user) {
    return NextResponse.json({ user: null, subscription: null }, { status: 401 });
  }

  const factoryId = session.factoryId ?? user.factoryId ?? undefined;
  if (user.role !== 'SUPER_ADMIN' && !factoryId) {
    return NextResponse.json(
      { user: null, subscription: null, error: 'Tài khoản chưa được gán nhà máy' },
      { status: 403 }
    );
  }

  if (!session.factoryId && factoryId) {
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      factoryId,
    });
    await setSessionCookie(token);
  }

  // Get subscription status for this factory
  const subscription = factoryId
    ? await getFactorySubscription(factoryId)
    : null;

  const daysRemaining = getDaysRemaining(subscription);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      factoryId,
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
