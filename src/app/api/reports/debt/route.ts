import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // --- Session auth ---
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'ACCOUNTANT' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customers = await prisma.customer.findMany({
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
      const outstanding = totalPayment - totalDebt; // Positive = customer owes

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
    filtered.sort((a, b) => b.outstandingDebt - a.outstandingDebt);

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('[GET /api/reports/debt]', error);
    return NextResponse.json({ error: 'Failed to fetch debt report' }, { status: 500 });
  }
}