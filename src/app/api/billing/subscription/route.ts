import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

export const runtime = 'nodejs';

// GET /api/billing/subscription
// Returns the subscription for the current logged-in factory.
// All tenant roles can read this because middleware uses it for write enforcement.
export async function GET() {
  try {
    const session = await requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const factoryId = session.factoryId;

    const subscription = await prisma.subscription.findFirst({
      where: { factoryId },
      orderBy: { createdAt: 'desc' },
    });

    const driverCount = await prisma.driver.count({
      where: { factoryId, isActive: true },
    });

    const factory = await prisma.factory.findUnique({
      where: { id: factoryId },
      select: { name: true },
    });

    return apiSuccess({ subscription, driverCount, factoryName: factory?.name ?? null });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[GET /api/billing/subscription]', error);
    return apiError('Failed to fetch subscription', 500);
  }
}
