import { NextRequest } from 'next/server';
import { prisma, prismaAuth } from '@/lib/db';
import { randomUUID } from 'crypto';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

// POST /api/staff/[id]/rotate-link — ADMIN only
// Regenerates the driver share-link token (invalidates the old /d/<token>
// URL immediately) and returns the fresh link for the office to hand over.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const { id } = await params;

    const user = await prisma.user.findFirst({
      where: { id, factoryId: session.factoryId, role: 'DRIVER' },
      select: { id: true, name: true, driverProfile: { select: { id: true } } },
    });

    if (!user?.driverProfile) {
      return apiError('Nhân sự này không có profile tài xế / link chia sẻ', 404);
    }

    const token = randomUUID();
    const driver = await prismaAuth.driver.update({
      where: { id: user.driverProfile.id },
      data: { token },
      select: { slug: true, token: true },
    });

    return apiSuccess({
      link: `/d/${driver.token}`,
      driverName: user.name,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/staff/[id]/rotate-link]', error);
    return apiError('Failed to rotate link', 500);
  }
}
