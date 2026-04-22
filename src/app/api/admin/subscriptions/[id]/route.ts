import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prismaAuth } from '@/lib/db';

const basePrisma = prismaAuth;

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
  const { status, extendDays, pricePerDriver, driverCount, recordPayment } = body;

  if (status !== undefined && status !== 'ACTIVE' && status !== 'CANCELLED') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  if (extendDays !== undefined && (!Number.isInteger(extendDays) || extendDays <= 0 || extendDays > 3650)) {
    return NextResponse.json({ error: 'extendDays must be an integer between 1 and 3650' }, { status: 400 });
  }

  if (pricePerDriver !== undefined && (typeof pricePerDriver !== 'number' || pricePerDriver < 0)) {
    return NextResponse.json({ error: 'pricePerDriver must be a non-negative number' }, { status: 400 });
  }

  if (driverCount !== undefined && (!Number.isInteger(driverCount) || driverCount < 0)) {
    return NextResponse.json({ error: 'driverCount must be a non-negative integer' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const sub = await basePrisma.subscription.findUnique({ where: { id } });

  if (!sub) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  // Handle status change (activate/deactivate)
  if (status === 'ACTIVE' || status === 'CANCELLED') {
    updates.status = status;
  }

  // Handle extend days (adds to current endDate, or to now if expired)
  if (typeof extendDays === 'number' && extendDays > 0) {
    const baseDate = sub.endDate > new Date() ? sub.endDate : new Date();
    const newEndDate = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000);
    updates.endDate = newEndDate;
    updates.planType = 'PAID';
    updates.status = 'ACTIVE';
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

  if (recordPayment === true && typeof extendDays === 'number' && extendDays > 0) {
    const price = Number(updated.pricePerDriver ?? 0);
    const amount = Math.max(0, Math.max(0, updated.driverCount - 1) * price);

    if (amount > 0) {
      await basePrisma.payment.create({
        data: {
          factoryId: updated.factoryId,
          amount,
          adminId: session.userId,
          confirmedAt: new Date(),
          notes: `Super admin confirmed payment and extended subscription ${updated.id} by ${extendDays} days`,
        },
      });
    }
  }

  return NextResponse.json({ subscription: updated });
}
