import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('[GET /api/products]', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
