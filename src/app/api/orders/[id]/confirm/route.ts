import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaAuth } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/helpers';

// PATCH /api/orders/[id]/confirm
// Body: { gps: { lat: number, lng: number } | null }
// Updates status to DELIVERED and saves GPS coordinates
const ConfirmSchema = z.object({
  gps: z.object({
    lat: z.number(),
    lng: z.number(),
  }).nullable().optional(), // Can be null if GPS capture failed (D-09)
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const parsed = ConfirmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request. Required: gps { lat, lng } or gps: null' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const bodyToken = typeof body?.token === 'string' ? body.token : null;
    const driver = authHeader?.startsWith('Bearer ')
      ? await prismaAuth.driver.findUnique({ where: { token: authHeader.slice(7) } })
      : bodyToken
      ? await prismaAuth.driver.findUnique({ where: { token: bodyToken } })
      : await getSessionDriver();
    if (!driver) {
      return NextResponse.json({ error: 'Invalid driver credentials' }, { status: 401 });
    }

    // --- Order ownership check ---
    const order = await prisma.order.findFirst({
      where: { id, factoryId: driver.factoryId },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.driverId !== driver.id) {
      return NextResponse.json({ error: 'Not authorized to confirm this order' }, { status: 403 });
    }

    // --- Update order to DELIVERED with GPS coordinates ---
    const gpsValue = parsed.data.gps == null ? Prisma.JsonNull : parsed.data.gps;
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveryGps: gpsValue,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: updated.id,
      status: updated.status,
      deliveryGps: updated.deliveryGps,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    // Handle Prisma not found error specifically
    if (error instanceof Error && error.name === 'NotFoundError') {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    console.error('[PATCH /api/orders/[id]/confirm]', error);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
  }
}

async function getSessionDriver() {
  const session = await requireRole(['DRIVER']);
  if (!session.factoryId) return null;

  return prismaAuth.driver.findFirst({
    where: {
      userId: session.userId,
      factoryId: session.factoryId,
      isActive: true,
      user: { role: 'DRIVER', isActive: true },
    },
  });
}
