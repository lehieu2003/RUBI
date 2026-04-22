import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }

    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 });
    }

    // Verify subscription belongs to this factory
    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, factoryId: session.factoryId },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Set grace period: endDate = now + 7 days
    const gracePeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        endDate: gracePeriodEnd,
      },
    });

    return NextResponse.json({
      success: true,
      gracePeriodEnd: gracePeriodEnd.toISOString(),
      subscription: updatedSubscription,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
