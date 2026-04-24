import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';

const CustomerPriceOverrideSchema = z.object({
  customerId: z.string().min(1),
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
    const parsed = CustomerPriceOverrideSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { customerId, productId, price } = parsed.data;
    const [customer, product] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, factoryId: session.factoryId },
        select: { id: true },
      }),
      prisma.product.findFirst({
        where: { id: productId, factoryId: session.factoryId },
        select: { id: true },
      }),
    ]);
    if (!customer || !product) {
      return NextResponse.json({ error: 'Customer or product not found' }, { status: 404 });
    }

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
    if (error instanceof Response) throw error;
    console.error('Error setting customer price override:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const productId = searchParams.get('productId');

    if (!customerId || !productId) {
      return NextResponse.json(
        { error: 'Missing customerId or productId' },
        { status: 400 }
      );
    }

    const [customer, product] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, factoryId: session.factoryId },
        select: { id: true },
      }),
      prisma.product.findFirst({
        where: { id: productId, factoryId: session.factoryId },
        select: { id: true },
      }),
    ]);
    if (!customer || !product) {
      return NextResponse.json({ error: 'Customer or product not found' }, { status: 404 });
    }

    await prisma.customerPriceOverride.deleteMany({
      where: { customerId, productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('Error removing customer price override:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
