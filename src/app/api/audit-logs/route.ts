import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { DEBT_ACTIONS } from '@/lib/audit';
import { MAX_PAGE_SIZE, paginationMeta, parsePagination } from '@/lib/pagination';
import { apiSuccess, apiError } from '@/lib/api-response';

// GET /api/audit-logs — who changed which order or debt, newest first,
// paginated. `type=ORDER` keeps the order entries, `type=DEBT` the ones that
// change what a customer owes; `orderId` and `customerId` narrow to one.
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const searchParams = new URL(request.url).searchParams;
    const pageRequest = parsePagination(searchParams);
    if (!pageRequest) {
      return apiError(`Tham số phân trang không hợp lệ (limit tối đa ${MAX_PAGE_SIZE})`, 400);
    }
    const type = searchParams.get('type');
    if (type !== null && type !== 'ORDER' && type !== 'DEBT') {
      return apiError('Loại nhật ký không hợp lệ', 400);
    }

    const where = {
      factoryId: session.factoryId,
      ...(type === 'DEBT' ? { action: { in: DEBT_ACTIONS } } : {}),
      ...(type === 'ORDER' ? { orderId: { not: null } } : {}),
      ...(searchParams.get('orderId') ? { orderId: searchParams.get('orderId') } : {}),
      ...(searchParams.get('customerId') ? { customerId: searchParams.get('customerId') } : {}),
    };
    const [totalItem, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: pageRequest.skip,
        take: pageRequest.limit,
      }),
    ]);

    const customerIds = [...new Set(logs.flatMap((log) => (log.customerId ? [log.customerId] : [])))];
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds }, factoryId: session.factoryId },
      select: { id: true, name: true },
    });
    const customerNames = new Map(customers.map((customer) => [customer.id, customer.name]));

    return apiSuccess(
      logs.map((log) => ({
        id: log.id,
        action: log.action,
        summary: log.summary,
        userName: log.userName,
        orderId: log.orderId,
        orderCode: log.orderId ? `DH-${log.orderId.slice(-6).toUpperCase()}` : null,
        customerId: log.customerId,
        customerName: log.customerId ? customerNames.get(log.customerId) ?? null : null,
        createdAt: log.createdAt,
      })),
      200,
      paginationMeta(pageRequest, totalItem)
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/audit-logs]', error);
    return apiError('Không thể tải nhật ký', 500);
  }
}
