import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';

// GET /api/drivers
// Returns active driver profiles backed by DRIVER user accounts.
// Supports ?active=true to return {count, drivers} for billing use.
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF']);
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
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
      return NextResponse.json({ count: drivers.length, drivers });
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

    return NextResponse.json(drivers);
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[GET /api/drivers]', error);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}

// POST /api/drivers - disabled; create DRIVER accounts from /settings staff management.
export async function POST() {
  try {
    await requireRole(['ADMIN']);
    await requireActiveSubscription();
    return NextResponse.json(
      { error: 'Tạo tài xế trong phần Nhân sự bằng role Tài xế', code: 'DRIVER_CREATE_FROM_STAFF' },
      { status: 405 }
    );
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[POST /api/drivers]', error);
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 });
  }
}
