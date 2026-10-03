import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return apiError('subscriptionId required', 400);
    }

    // Verify subscription belongs to this factory
    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, factoryId: session.factoryId },
    });

    if (!subscription) {
      return apiError('Subscription not found', 404);
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

    return apiSuccess({
          success: true,
          gracePeriodEnd: gracePeriodEnd.toISOString(),
          subscription: updatedSubscription,
        });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Cancel subscription error:', error);
    return apiError('Internal server error', 500);
  }
}
