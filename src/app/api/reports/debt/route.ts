import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    // --- Session auth ---
    const session = await getSession();
    if (!session) {
      return apiError('Chưa đăng nhập hoặc phiên đã hết hạn', 401);
    }
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }
    if (session.role !== 'ADMIN') {
      return apiError('Bạn không có quyền thực hiện thao tác này', 403);
    }

    const customers = await prisma.customer.findMany({
      where: { factoryId: session.factoryId },
      include: {
        debtLedger: true,
      },
    });

    const debtReport = customers.map((customer) => {
      const totalDebt = customer.debtLedger
        .filter(e => e.type === 'DEBT')
        .reduce((sum, e) => sum + e.amount.toNumber(), 0);
      const totalPayment = customer.debtLedger
        .filter(e => e.type === 'PAYMENT')
        .reduce((sum, e) => sum + e.amount.toNumber(), 0);
      const outstanding = totalDebt - totalPayment; // Positive = customer owes

      // Find last payment date
      const paymentEntries = customer.debtLedger.filter(e => e.type === 'PAYMENT');
      const lastPaymentDate = paymentEntries.length > 0
        ? paymentEntries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
        : null;

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
    console.error('[GET /api/reports/debt]', error);
    return apiError('Không thể tải báo cáo công nợ', 500);
  }
}
