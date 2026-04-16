import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/drivers
// Returns all active drivers
export async function GET(request: NextRequest) {
  try {
    const drivers = await prisma.driver.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(drivers);
  } catch (error) {
    console.error('[GET /api/drivers]', error);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}