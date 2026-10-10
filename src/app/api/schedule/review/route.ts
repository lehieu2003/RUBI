import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from '@/lib/api-response';

const ReviewSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  action: z.enum(['APPROVE', 'REJECT']),
});

// POST /api/schedule/review — the manager approves or rejects shift requests.
// Body: { ids: string[], action: 'APPROVE' | 'REJECT' }
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const parsed = ReviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError('Invalid request. Required: ids (string[]) and action (APPROVE | REJECT)', 400);
    }

    const result = await prisma.scheduleAssignment.updateMany({
      where: { id: { in: parsed.data.ids }, factoryId: session.factoryId },
      data: {
        status: parsed.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        reviewedAt: new Date(),
      },
    });

    return apiSuccess({ updated: result.count });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/schedule/review]', error);
    return apiError('Review failed', 500);
  }
}
