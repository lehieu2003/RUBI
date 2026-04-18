import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const basePrisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const factoryId = searchParams.get('factoryId') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

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

  // Get all matching payments (up to 10000)
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
    take: 10000,
  });

  // Format date as DD/MM/YYYY HH:mm (Vietnam locale)
  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Format amount as Vietnam locale (dot thousand separator, comma decimal)
  const formatAmount = (amount: number) => {
    const parts = amount.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  };

  // Build CSV
  const headers = ['Date', 'Admin', 'Factory', 'Amount'];
  const rows = payments.map(p => [
    formatDate(p.confirmedAt),
    p.admin.name,
    p.factory.name,
    formatAmount(Number(p.amount)),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Generate filename with current date
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const filename = `audit-logs-${year}-${month}-${day}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
