import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { subscriptionId, amount } = body;

    if (!subscriptionId || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid input: subscriptionId and positive amount required' }, { status: 400 });
    }

    // Verify subscription belongs to this factory
    const factoryId = session.factoryId;
    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, factoryId },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }
    if (subscription.factoryId !== factoryId) {
      return NextResponse.json({ error: 'Subscription does not belong to your factory' }, { status: 403 });
    }

    // Update subscription: planType = PAID, status = ACTIVE, extend endDate +30 days
    const newEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planType: 'PAID',
        status: 'ACTIVE',
        endDate: newEndDate,
      },
    });

    return NextResponse.json({ success: true, subscription: updatedSubscription });
  } catch (error) {
    console.error('[POST /api/payments/confirm]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
