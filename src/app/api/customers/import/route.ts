import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

interface CustomerImportRow {
  code: string;
  name: string;
  phone?: string;
  address?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'ACCOUNTANT']);
    if (!session.factoryId) {
      return apiError('Bad Request: factoryId not found', 400);
    }

    const body = await req.json();
    const { customers } = body as { customers: CustomerImportRow[] };

    if (!Array.isArray(customers)) {
      return apiError('customers must be an array', 400);
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

    return apiSuccess({ imported, skipped, errors });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/customers/import]', error);
    return apiError('Internal server error', 500);
  }
}
