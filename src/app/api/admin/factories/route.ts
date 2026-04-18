import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const basePrisma = new PrismaClient();

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const factories = await basePrisma.factory.findMany({
    where: { isSystem: false },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: { drivers: { where: { isActive: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to include current subscription and driver count
  const result = factories.map(f => ({
    id: f.id,
    name: f.name,
    phone: f.phone,
    address: f.address,
    createdAt: f.createdAt,
    subscription: f.subscriptions[0] ?? null,
    activeDriverCount: f._count.drivers,
  }));

  return NextResponse.json({ factories: result });
}
