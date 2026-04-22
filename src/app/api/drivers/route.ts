import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';

// GET /api/drivers
// Returns all active drivers.
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
        where: { isActive: true, factoryId: session.factoryId },
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ count: drivers.length, drivers });
    }

    const drivers = await prisma.driver.findMany({
      where: { isActive: true, factoryId: session.factoryId },
      select: {
        id: true,
        name: true,
        phone: true,
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

// POST /api/drivers - Add new driver (ADMIN only, allows inactive)
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }

    const body = await request.json();
    const { name, phone, isActive = true } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);

    const driver = await prisma.driver.create({
      data: {
        name,
        slug,
        phone: phone || null,
        isActive,
        factoryId: session.factoryId,
      },
    });

    return NextResponse.json({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      slug: driver.slug,
      isActive: driver.isActive,
      token: driver.token,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[POST /api/drivers]', error);
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 });
  }
}
