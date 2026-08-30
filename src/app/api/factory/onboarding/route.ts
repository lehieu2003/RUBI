import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    await prisma.factory.update({
      where: { id: session.factoryId },
      data: { onboardingCompleted: true },
    });

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('Onboarding complete error:', error);
    return apiError('Lỗi server', 500);
  }
}
