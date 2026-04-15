import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const CustomerPriceOverrideSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  price: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CustomerPriceOverrideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { customerId, productId, price } = parsed.data;

    await prisma.customerPriceOverride.upsert({
      where: {
        customerId_productId: { customerId, productId },
      },
      update: {
        pricePerUnit: new Prisma.Decimal(price.toFixed(2)),
      },
      create: {
        customerId,
        productId,
        pricePerUnit: new Prisma.Decimal(price.toFixed(2)),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting customer price override:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const productId = searchParams.get('productId');

    if (!customerId || !productId) {
      return NextResponse.json(
        { error: 'Missing customerId or productId' },
        { status: 400 }
      );
    }

    await prisma.customerPriceOverride.deleteMany({
      where: { customerId, productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing customer price override:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}