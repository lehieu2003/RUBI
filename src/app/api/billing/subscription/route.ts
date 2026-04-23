import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

// GET /api/billing/subscription
// Returns the subscription for the current logged-in factory.
// All tenant roles can read this because middleware uses it for write enforcement.
export async function GET() {
  try {
    const session = await requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF']);
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }

    const factoryId = session.factoryId;

    const subscription = await prisma.subscription.findFirst({
      where: { factoryId },
      orderBy: { createdAt: 'desc' },
    });

    const driverCount = await prisma.driver.count({
      where: { factoryId, isActive: true },
    });

    return NextResponse.json({ subscription, driverCount });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[GET /api/billing/subscription]', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
