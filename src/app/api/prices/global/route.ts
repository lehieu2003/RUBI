import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

const SetGlobalPriceSchema = z.object({
  productId: z.string().min(1),
  price: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const body = await request.json();
    const parsed = SetGlobalPriceSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Invalid request', 400);
    }

    const { productId, price } = parsed.data;

    const product = await prisma.product.findFirst({
      where: { id: productId, factoryId: session.factoryId },
      select: { id: true },
    });
    if (!product) {
      return apiError('Product not found', 404);
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

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('Error setting global price:', error);
    return apiError('Internal server error', 500);
  }
}
