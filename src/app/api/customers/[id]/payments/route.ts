import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { RecordPaymentBody } from '@/lib/contracts/customers';
import { dong, recordAudit } from '@/lib/audit';
import { apiSuccess, apiError } from '@/lib/api-response';
import { Idempotency } from '@/lib/idempotency';
import { retryIfCancelled } from '@/lib/transactions';

// POST /api/customers/[id]/payments — the manager records money received
// from a customer. It is stored as a PAYMENT entry in the debt ledger, which
// lowers what the customer owes.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }
    const factoryId = session.factoryId;
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

    const idempotency = Idempotency.from(request, factoryId, `POST /api/customers/${id}/payments`, parsed.data);
    if (idempotency instanceof Response) return idempotency;

    // Check and write in one transaction so two payments recorded at the same
    // moment cannot both pass the "not more than the debt" check. A resend of
    // the same submission (same Idempotency-Key) gets the first answer back.
    // A run cancelled by an overlapping payment rolls back its claim of the
    // key too, so the next run claims it again.
    return await idempotency.run(() =>
      retryIfCancelled(() => prisma.$transaction(
        async (tx) => {
          await idempotency.begin(tx);
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
            return idempotency.finish(
              tx,
              apiError(
                `Số tiền thu vượt quá công nợ hiện tại (${owed.toLocaleString('vi-VN')}đ)`,
                409,
                'PAYMENT_EXCEEDS_DEBT'
              )
            );
          }
          const payment = await tx.customerDebtLedger.create({
            data: { customerId: id, type: 'PAYMENT', amount, notes: notes || null },
          });
          await recordAudit(
            tx,
            { factoryId, userId: session.userId, userName: session.name },
            {
              action: 'DEBT_PAYMENT',
              customerId: id,
              summary: `Thu tiền ${dong(amount)}${notes ? ` (${notes})` : ''}. Còn nợ ${dong(owed - amount)}`,
            }
          );
          return idempotency.finish(
            tx,
            apiSuccess(
              {
                payment: { ...payment, amount: payment.amount.toNumber() },
                outstandingDebt: owed - amount,
              },
              201
            )
          );
        },
        { isolationLevel: 'Serializable' }
      ))
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/customers/[id]/payments]', error);
    return apiError('Không thể ghi nhận thanh toán', 500);
  }
}
