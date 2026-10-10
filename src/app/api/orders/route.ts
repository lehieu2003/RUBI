import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { orderWhere } from '@/lib/order-filters';
import { MAX_PAGE_SIZE, paginationMeta, parsePagination } from '@/lib/pagination';
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /api/orders - List orders with filters (D-06)
// Supports: customerId, status, date
export async function GET(request: NextRequest) {
  try {
    // --- Session auth ---
    const session = await requireRole(['ADMIN', 'STAFF']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const { searchParams } = new URL(request.url);
    const pageRequest = parsePagination(searchParams);
    if (!pageRequest) {
      return apiError(`Tham số phân trang không hợp lệ (limit tối đa ${MAX_PAGE_SIZE})`, 400);
    }
    const where = orderWhere(session.factoryId, searchParams);
    if (!where) {
      return apiError('Ngày không hợp lệ', 400);
    }

    const [totalItem, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          driver: { select: { id: true, name: true } },
          orderItems: { include: { product: true } },
        },
        // id breaks ties so pages never overlap or skip a row
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: pageRequest.skip,
        take: pageRequest.limit,
      }),
    ]);

    const serialized = orders.map((order) => ({
      ...order,
      total: order.total.toNumber(),
      orderItems: order.orderItems.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toNumber(),
        lineTotal: item.lineTotal.toNumber(),
      })),
    }));

    return apiSuccess(serialized, 200, paginationMeta(pageRequest, totalItem));
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/orders]', error);
    return apiError('Không thể tải danh sách đơn hàng', 500);
  }
}
