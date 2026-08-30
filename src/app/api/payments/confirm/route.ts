import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prismaAuth } from '@/lib/db';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }

    if (session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
      return apiError('Forbidden', 403);
    }

    const body = await req.json();
    const { subscriptionId, amount } = body;

    if (!subscriptionId || typeof amount !== 'number' || amount < 0) {
      return apiError('Invalid input: subscriptionId and non-negative amount required', 400);
    }

    const subscription = session.role === 'SUPER_ADMIN'
      ? await prismaAuth.subscription.findUnique({ where: { id: subscriptionId } })
      : await prismaAuth.subscription.findFirst({
          where: {
            id: subscriptionId,
            factoryId: session.factoryId,
          },
        });

    if (!subscription) {
      return apiError('Subscription not found', 404);
    }

    const baseDate = subscription.endDate > new Date() ? subscription.endDate : new Date();
    const newEndDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const updatedSubscription = await prismaAuth.subscription.update({
      where: { id: subscriptionId },
      data: {
        planType: 'PAID',
        status: 'ACTIVE',
        endDate: newEndDate,
      },
    });

    const monthlyAmount =
      Math.max(0, (updatedSubscription.driverCount ?? 0) - 1) *
      (updatedSubscription.pricePerDriver?.toNumber() ?? 0);
    await prismaAuth.payment.create({
      data: {
        factoryId: updatedSubscription.factoryId,
        amount: monthlyAmount > 0 ? monthlyAmount : amount,
        adminId: session.userId,
        confirmedAt: new Date(),
        notes:
          session.role === 'SUPER_ADMIN'
            ? `Super admin confirmed VietQR payment for subscription ${updatedSubscription.id}`
            : `Tenant admin self-upgraded subscription ${updatedSubscription.id}`,
      },
    });

    return apiSuccess({ success: true, subscription: updatedSubscription });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[POST /api/payments/confirm]', error);
    return apiError('Internal server error', 500);
  }
}
