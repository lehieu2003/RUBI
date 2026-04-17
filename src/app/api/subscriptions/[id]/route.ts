import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const subscription = await prisma.subscription.findUnique({
    where: { id },
  });

  if (!subscription || subscription.factoryId !== session.factoryId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ subscription });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { id } = await params;

  const subscription = await prisma.subscription.findUnique({
    where: { id },
  });

  if (!subscription || subscription.factoryId !== session.factoryId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();

  // Only allow updating driverCount and pricePerDriver
  const updates: { driverCount?: number; pricePerDriver?: number } = {};

  if (typeof body.driverCount === 'number' && body.driverCount >= 0) {
    updates.driverCount = body.driverCount;
  }

  if (typeof body.pricePerDriver === 'number' && body.pricePerDriver >= 1000) {
    updates.pricePerDriver = body.pricePerDriver;
  }

  const updated = await prisma.subscription.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({ subscription: updated });
}
