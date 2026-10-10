import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { RecordPaymentBody } from '@/lib/contracts/customers';
import { apiSuccess, apiError } from '@/lib/api-response';

// POST /api/customers/[id]/payments — the manager records money received
// from a customer. It is stored as a PAYMENT entry in the debt ledger, which
// lowers what the customer owes.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }
    const { id } = await params;

    const parsed = RecordPaymentBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ', 400);
    }
    const { amount, notes } = parsed.data;

    const customer = await prisma.customer.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true },
    });
    if (!customer) {
      return apiError('Không tìm thấy khách hàng', 404);
    }

    // Check and write in one transaction so two payments recorded at the same
    // moment cannot both pass the "not more than the debt" check.
    const result = await prisma.$transaction(
      async (tx) => {
        // What the customer owes right now: DEBT entries minus PAYMENT entries.
        const groups = await tx.customerDebtLedger.groupBy({
          by: ['type'],
          where: { customerId: id },
          _sum: { amount: true },
        });
        const sum = (type: 'DEBT' | 'PAYMENT') =>
          groups.find((group) => group.type === type)?._sum.amount?.toNumber() ?? 0;
        const owed = sum('DEBT') - sum('PAYMENT');

        if (amount > owed) {
          return { ok: false as const, owed };
        }
        const payment = await tx.customerDebtLedger.create({
          data: { customerId: id, type: 'PAYMENT', amount, notes: notes || null },
        });
        return { ok: true as const, payment, remaining: owed - amount };
      },
      { isolationLevel: 'Serializable' }
    );

    if (!result.ok) {
      return apiError(
        `Số tiền thu vượt quá công nợ hiện tại (${result.owed.toLocaleString('vi-VN')}đ)`,
        409,
        'PAYMENT_EXCEEDS_DEBT'
      );
    }

    return apiSuccess(
      {
        payment: { ...result.payment, amount: result.payment.amount.toNumber() },
        outstandingDebt: result.remaining,
      },
      201
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/customers/[id]/payments]', error);
    return apiError('Không thể ghi nhận thanh toán', 500);
  }
}
