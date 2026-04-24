import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';

const SetGlobalPriceSchema = z.object({
  productId: z.string().min(1),
  price: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = SetGlobalPriceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, price } = parsed.data;

    const product = await prisma.product.findFirst({
      where: { id: productId, factoryId: session.factoryId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

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
    if (error instanceof Response) throw error;
    console.error('Error setting global price:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
