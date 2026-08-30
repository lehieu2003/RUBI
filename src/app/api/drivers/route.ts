import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /api/drivers
// Returns active driver profiles backed by DRIVER user accounts.
// Supports ?active=true to return {count, drivers} for billing use.
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const { searchParams } = new URL(request.url);
    const activeParam = searchParams.get('active');

    // Billing count mode: ?active=true returns { count, drivers }
    if (activeParam === 'true') {
      const drivers = await prisma.driver.findMany({
        where: {
          isActive: true,
          factoryId: session.factoryId,
          user: { role: 'DRIVER', isActive: true },
        },
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' },
      });
      return apiSuccess({ count: drivers.length, drivers });
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
    if (error instanceof Response) throw error;
    console.error('[GET /api/drivers]', error);
    return apiError('Failed to fetch drivers', 500);
  }
}

// POST /api/drivers - disabled; create DRIVER accounts from /settings staff management.
export async function POST() {
  try {
    await requireRole(['ADMIN']);
    await requireActiveSubscription();
    return apiError('Tạo tài xế trong phần Nhân sự bằng role Tài xế', 405);
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[POST /api/drivers]', error);
    return apiError('Failed to create driver', 500);
  }
}
