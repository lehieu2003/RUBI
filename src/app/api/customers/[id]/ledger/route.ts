import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { MAX_PAGE_SIZE, paginationMeta, parsePagination } from '@/lib/pagination';
import { apiSuccess, apiError } from '@/lib/api-response';

// GET /api/customers/[id]/ledger — a customer's debt and payment entries,
// newest first, paginated.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }
    const { id } = await params;

    const pageRequest = parsePagination(new URL(request.url).searchParams);
    if (!pageRequest) {
      return apiError(`Tham số phân trang không hợp lệ (limit tối đa ${MAX_PAGE_SIZE})`, 400);
    }

    const customer = await prisma.customer.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true },
    });
    if (!customer) {
      return apiError('Không tìm thấy khách hàng', 404);
    }

    const [totalItem, entries] = await Promise.all([
      prisma.customerDebtLedger.count({ where: { customerId: id } }),
      prisma.customerDebtLedger.findMany({
        where: { customerId: id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: pageRequest.skip,
        take: pageRequest.limit,
      }),
    ]);

    return apiSuccess(
      entries.map((entry) => ({ ...entry, amount: entry.amount.toNumber() })),
      200,
      paginationMeta(pageRequest, totalItem)
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/customers/[id]/ledger]', error);
    return apiError('Không thể tải lịch sử công nợ', 500);
  }
}
