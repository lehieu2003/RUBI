import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/billing/subscription
// Returns the subscription for the current logged-in factory (ADMIN user)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const factoryId = session.factoryId || session.userId;

    const subscription = await prisma.subscription.findFirst({
      where: { factoryId },
      orderBy: { createdAt: 'desc' },
    });

    const driverCount = await prisma.driver.count({
      where: { isActive: true },
    });

    return NextResponse.json({ subscription, driverCount });
  } catch (error) {
    console.error('[GET /api/billing/subscription]', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
