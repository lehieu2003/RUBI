import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

const CustomerPriceOverrideSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  price: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const body = await request.json();
    const parsed = CustomerPriceOverrideSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Invalid request', 400);
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
      return apiError('Customer or product not found', 404);
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

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error setting customer price override:', error);
    return apiError('Internal server error', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const productId = searchParams.get('productId');

    if (!customerId || !productId) {
      return apiError('Missing customerId or productId', 400);
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
      return apiError('Customer or product not found', 404);
    }

    await prisma.customerPriceOverride.deleteMany({
      where: { customerId, productId },
    });

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error removing customer price override:', error);
    return apiError('Internal server error', 500);
  }
}
