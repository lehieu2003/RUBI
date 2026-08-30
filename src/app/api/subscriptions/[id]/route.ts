import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return apiError('Unauthorized', 401);
  }
  if (!session.factoryId) {
    return apiError('Bad Request: factoryId not found', 400);
  }

  const { id } = await params;

  const subscription = await prisma.subscription.findFirst({
    where: { id, factoryId: session.factoryId },
  });

  if (!subscription) {
    return apiError('Not found', 404);
  }

  return apiSuccess({ subscription });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(['ADMIN']);
  await requireActiveSubscription();
  if (!session.factoryId) {
    return apiError('Bad Request: factoryId not found', 400);
  }

  const { id } = await params;

  const subscription = await prisma.subscription.findFirst({
    where: { id, factoryId: session.factoryId },
  });

  if (!subscription) {
    return apiError('Not found', 404);
  }

  const body = await req.json();

  // Only allow updating driverCount and pricePerDriver
  const updates: { driverCount?: number; pricePerDriver?: number } = {};

  if (typeof body.driverCount === 'number' && body.driverCount >= 0) {
    updates.driverCount = body.driverCount;
  }

  if (typeof body.pricePerDriver === 'number' && body.pricePerDriver >= 1000) {
    updates.pricePerDriver = body.pricePerDriver;
  }

  const updated = await prisma.subscription.update({
    where: { id },
    data: updates,
  });

  return apiSuccess({ subscription: updated });
}
