import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { prisma, prismaAuth } from '@/lib/db';
import { isSubscriptionActive } from '@/lib/subscription-status';

// NOTE: These helper functions throw NextResponse objects as exceptions.
// Route handlers convert them into real responses with
// `if (error instanceof Response) return error;` in their catch block —
// Next.js route handlers do NOT serve a thrown Response by themselves.
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
      const impersonateToken = cookieStore.get('impersonate_token')?.value;
      if (impersonateToken) {
        const impersonationLog = await prismaAuth.impersonationLog.findUnique({
          where: { token: impersonateToken },
          select: { endedAt: true },
        });
        if (impersonationLog && !impersonationLog.endedAt) {
          return session;
        }
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
