import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError('Unauthorized', 401);
    }
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const products = await prisma.product.findMany({
      where: { isActive: true, factoryId: session.factoryId },
      orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
    });
    return apiSuccess(products);
  } catch (error) {
    console.error('[GET /api/products]', error);
    return apiError('Failed to fetch products', 500);
  }
}
