import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { MAX_PAGE_SIZE, paginationMeta, parsePagination } from '@/lib/pagination';
import { apiSuccess, apiError } from '@/lib/api-response';

// GET /api/inventory/counts — the history of stock counts, newest first,
// paginated. Each entry holds the book quantity, the counted quantity and
// their difference (negative = loss).
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const pageRequest = parsePagination(new URL(request.url).searchParams);
    if (!pageRequest) {
      return apiError(`Tham số phân trang không hợp lệ (limit tối đa ${MAX_PAGE_SIZE})`, 400);
    }

    const where = { factoryId: session.factoryId };
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
