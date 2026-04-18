import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const basePrisma = new PrismaClient();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, extendDays, pricePerDriver, driverCount } = body;

  const updates: Record<string, unknown> = {};

  // Handle status change (activate/deactivate)
  if (status === 'ACTIVE' || status === 'CANCELLED') {
    updates.status = status;
  }

  // Handle extend days (adds to current endDate, or to now if expired)
  if (typeof extendDays === 'number' && extendDays > 0) {
    const sub = await basePrisma.subscription.findUnique({ where: { id } });
    if (sub) {
      const baseDate = sub.endDate > new Date() ? sub.endDate : new Date();
      const newEndDate = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000);
      updates.endDate = newEndDate;
    }
  }

  // Handle price per driver update
  if (typeof pricePerDriver === 'number' && pricePerDriver >= 0) {
    updates.pricePerDriver = pricePerDriver;
  }

  // Handle driver count override
  if (typeof driverCount === 'number' && driverCount >= 0) {
    updates.driverCount = driverCount;
  }

  const updated = await basePrisma.subscription.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({ subscription: updated });
}
