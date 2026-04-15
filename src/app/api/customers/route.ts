import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(customers);
  } catch (error) {
    console.error('[GET /api/customers]', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
