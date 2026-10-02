import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isSubscriptionActive } from '@/lib/subscription-status';

// NOTE: These helper functions throw NextResponse objects directly as exceptions.
// This is a non-standard pattern but widely used in this codebase. Callers must
// handle these via instanceof Response checks or let Next.js handle them directly.
// This pattern avoids the need for custom error classes while providing typed responses.

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
    // During an active impersonation session the SUPER_ADMIN reads tenant
    // data as support staff; write attempts are still rejected by the
    // middleware's READ_ONLY_IMPERSONATION guard.
    if (session.role === 'SUPER_ADMIN') {
      const cookieStore = await cookies();
      if (cookieStore.get('impersonate_token')?.value) {
        return session;
      }
    }
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
