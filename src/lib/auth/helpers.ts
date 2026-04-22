import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isSubscriptionActive } from '@/lib/subscription-status';

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}

export async function requireRole(roles: string[]) {
  const session = await requireSession();
  if (!session.role || !roles.includes(session.role)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session;
}

export async function requireFactoryId() {
  const session = await requireSession();
  if (!session.factoryId) {
    throw NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
  }
  return session;
}

export async function requireActiveSubscription() {
  const session = await requireSession();
  if (!session.factoryId) {
    throw NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
  }
  const subscription = await prisma.subscription.findFirst({
    where: { factoryId: session.factoryId },
    orderBy: { createdAt: 'desc' },
  });
  if (!isSubscriptionActive(subscription)) {
    throw NextResponse.json({ error: 'Subscription Required' }, { status: 403 });
  }
  return session;
}
