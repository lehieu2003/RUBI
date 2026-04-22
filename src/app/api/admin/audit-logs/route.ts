import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prismaAuth } from '@/lib/db';

const basePrisma = prismaAuth;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const factoryId = searchParams.get('factoryId') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const skip = (page - 1) * limit;

  // Retention: only payments from the last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // Build where clause
  const where: Record<string, unknown> = {
    confirmedAt: {
      gte: twelveMonthsAgo,
    },
  };

  if (factoryId) {
    where.factoryId = factoryId;
  }

  if (startDate) {
    where.confirmedAt = {
      ...(where.confirmedAt as object),
      gte: new Date(startDate),
    };
  }

  if (endDate) {
    const endDateObj = new Date(endDate);
    endDateObj.setHours(23, 59, 59, 999);
    where.confirmedAt = {
      ...(where.confirmedAt as object),
      lte: endDateObj,
    };
  }

  // Get total count
  const total = await basePrisma.payment.count({ where });

  // Get paginated payments with factory and admin info
  const payments = await basePrisma.payment.findMany({
    where,
    include: {
      factory: {
        select: { id: true, name: true },
      },
      admin: {
        select: { id: true, name: true },
      },
    },
    orderBy: { confirmedAt: 'desc' },
    skip,
    take: limit,
  });

  // Transform to audit log format
  const logs = payments.map(p => ({
    id: p.id,
    confirmedAt: p.confirmedAt.toISOString(),
    amount: Number(p.amount),
    adminName: p.admin.name,
    factoryName: p.factory.name,
  }));

  return NextResponse.json({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
