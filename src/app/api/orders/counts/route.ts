import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { orderWhere } from '@/lib/order-filters';
import { apiSuccess, apiError } from '@/lib/api-response';

// GET /api/orders/counts — number of orders per status under the same
// filters as the list (customerId, driverId, date, q). Feeds the status tabs,
// which cannot count from one page of a paginated list.
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'STAFF']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const where = orderWhere(session.factoryId, new URL(request.url).searchParams, { withStatus: false });
    if (!where) {
      return apiError('Ngày không hợp lệ', 400);
    }

    const groups = await prisma.order.groupBy({ by: ['status'], where, _count: { _all: true } });
    const byStatus = { PENDING: 0, SHIPPING: 0, DELIVERED: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const group of groups) byStatus[group.status] = group._count._all;

    return apiSuccess({ total: Object.values(byStatus).reduce((sum, count) => sum + count, 0), byStatus });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/orders/counts]', error);
    return apiError('Không thể tải danh sách đơn hàng', 500);
  }
}
