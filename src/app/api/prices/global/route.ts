import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const SetGlobalPriceSchema = z.object({
  productId: z.string().min(1),
  price: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SetGlobalPriceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, price } = parsed.data;

    await prisma.globalPrice.upsert({
      where: { productId },
      update: {
        pricePerUnit: new Prisma.Decimal(price.toFixed(2)),
      },
      create: {
        productId,
        pricePerUnit: new Prisma.Decimal(price.toFixed(2)),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting global price:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}