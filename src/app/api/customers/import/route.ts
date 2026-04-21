import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface CustomerImportRow {
  code: string;
  name: string;
  phone?: string;
  address?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'ADMIN' && session.role !== 'ACCOUNTANT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { customers } = body as { customers: CustomerImportRow[] };

    if (!Array.isArray(customers)) {
      return NextResponse.json(
        { error: 'customers must be an array' },
        { status: 400 }
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const customer of customers) {
      const code = String(customer.code ?? '').trim();
      const name = String(customer.name ?? '').trim();

      if (!code || !name) {
        skipped++;
        continue;
      }

      try {
        // Customer.code is factory-scoped unique — check code + factoryId before inserting
        const existing = await prisma.customer.findFirst({
          where: { code, factoryId: session.factoryId },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.customer.create({
          data: {
            code,
            name,
            phone: String(customer.phone ?? '').trim() || '',
            address: String(customer.address ?? '').trim() || '',
            isActive: true,
            factoryId: session.factoryId,
          },
        });
        imported++;
      } catch (err) {
        errors.push(`Error importing ${code}: ${String(err)}`);
        skipped++;
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch (error) {
    console.error('[POST /api/customers/import]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
