import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { MAX_PAGE_SIZE, paginationMeta, parsePagination } from '@/lib/pagination';
import { stockCountWhere } from '@/lib/stock-count-filters';
import { apiSuccess, apiError } from '@/lib/api-response';

// GET /api/inventory/counts — the history of stock counts, newest first,
// paginated, optionally for one product and a range of days. Each entry holds
// the book quantity, the counted quantity and their difference (negative = loss).
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

    const where = stockCountWhere(session.factoryId, searchParams);
    if (!where) {
      return apiError('Khoảng ngày không hợp lệ', 400);
    }
    const [totalItem, counts] = await Promise.all([
      prisma.stockCount.count({ where }),
      prisma.stockCount.findMany({
        where,
        include: {
          product: { select: { name: true, sizeKg: true, unit: true } },
          countedBy: { select: { name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: pageRequest.skip,
        take: pageRequest.limit,
      }),
    ]);

    return apiSuccess(
      counts.map((count) => ({
        id: count.id,
        productId: count.productId,
        productName: count.product.name,
        sizeKg: count.product.sizeKg,
        unit: count.product.unit,
        bookQuantity: count.bookQuantity,
        countedQuantity: count.countedQuantity,
        difference: count.countedQuantity - count.bookQuantity,
        note: count.note,
        countedByName: count.countedBy?.name ?? null,
        createdAt: count.createdAt,
      })),
      200,
      paginationMeta(pageRequest, totalItem)
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/inventory/counts]', error);
    return apiError('Không thể tải lịch sử kiểm kho', 500);
  }
}
