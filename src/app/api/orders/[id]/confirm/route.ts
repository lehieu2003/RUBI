import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

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

    // Update order to DELIVERED with GPS coordinates
    // Convert null to Prisma.JsonNull for Json field type compatibility
    const gpsValue = parsed.data.gps == null ? Prisma.JsonNull : parsed.data.gps;
    const order = await prisma.order.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveryGps: gpsValue,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      deliveryGps: order.deliveryGps,
    });
  } catch (error) {
    console.error('[PATCH /api/orders/[id]/confirm]', error);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
  }
}