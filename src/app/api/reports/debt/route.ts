import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    // Totals per customer and entry type are summed by the database, so the
    // report does not read the whole ledger, which grows with every order.
    const [customers, groups] = await Promise.all([
      prisma.customer.findMany({
        where: { factoryId: session.factoryId },
        select: { id: true, name: true },
      }),
      prisma.customerDebtLedger.groupBy({
        by: ['customerId', 'type'],
        where: { customer: { factoryId: session.factoryId } },
        _sum: { amount: true },
        _max: { createdAt: true },
      }),
    ]);
    const groupByKey = new Map(groups.map((group) => [`${group.customerId}:${group.type}`, group]));
    const groupOf = (customerId: string, type: 'DEBT' | 'PAYMENT') => groupByKey.get(`${customerId}:${type}`);

    const debtReport = customers.map((customer) => {
      const debt = groupOf(customer.id, 'DEBT');
      const payment = groupOf(customer.id, 'PAYMENT');
      const totalDebt = debt?._sum.amount?.toNumber() ?? 0;
      const totalPayment = payment?._sum.amount?.toNumber() ?? 0;
      const outstanding = totalDebt - totalPayment; // Positive = customer owes
      const lastPaymentDate = payment?._max.createdAt ?? null;

      return {
        customerId: customer.id,
        customerName: customer.name,
        outstandingDebt: outstanding,
        lastPaymentDate,
      };
    });

    // Sort by outstanding debt descending (highest debt first), hide zero-balance
    const filtered = debtReport.filter(d => d.outstandingDebt > 0);
    const sorted = [...filtered].sort((a, b) => b.outstandingDebt - a.outstandingDebt);

    return apiSuccess(sorted);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/reports/debt]', error);
    return apiError('Không thể tải báo cáo công nợ', 500);
  }
}
