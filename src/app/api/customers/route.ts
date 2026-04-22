import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole, requireActiveSubscription } from '@/lib/auth/helpers';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'ACCOUNTANT', 'STAFF']);
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';

    if (countOnly) {
      const count = await prisma.customer.count({ where: { isActive: true, factoryId: session.factoryId } });
      return NextResponse.json({ count });
    }

    const customers = await prisma.customer.findMany({
      where: { isActive: true, factoryId: session.factoryId },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(customers);
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[GET /api/customers]', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

// POST /api/customers - Add new customer (ADMIN only, allows inactive)
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    await requireActiveSubscription();
    if (!session.factoryId) {
      return NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
    }

    const body = await request.json();
    const { code, name, address, phone, isActive = true } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: { code, name, address: address || '', phone: phone || '', isActive, factoryId: session.factoryId },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[POST /api/customers]', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
