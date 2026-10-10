import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /api/drivers
// Returns active driver profiles backed by DRIVER user accounts.
export async function GET() {
  try {
    const session = await requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const drivers = await prisma.driver.findMany({
      where: {
        isActive: true,
        factoryId: session.factoryId,
        user: { role: 'DRIVER', isActive: true },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        slug: true,
        token: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return apiSuccess(drivers);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/drivers]', error);
    return apiError('Failed to fetch drivers', 500);
  }
}

// POST /api/drivers - disabled; create DRIVER accounts from /settings staff management.
export async function POST() {
  try {
    await requireRole(['ADMIN']);
    return apiError('Tạo tài xế trong phần Nhân sự bằng role Tài xế', 405);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/drivers]', error);
    return apiError('Failed to create driver', 500);
  }
}
