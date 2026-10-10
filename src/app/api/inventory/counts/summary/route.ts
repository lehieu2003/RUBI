import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { stockCountWhere } from '@/lib/stock-count-filters';
import { apiSuccess, apiError } from '@/lib/api-response';

// GET /api/inventory/counts/summary — total loss and surplus over the stock
// counts matching the same filters as the history (productId, from, to).
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const where = stockCountWhere(session.factoryId, new URL(request.url).searchParams);
    if (!where) {
      return apiError('Khoảng ngày không hợp lệ', 400);
    }

    // Counts are a handful per product per week, so adding them up here is cheap.
    const counts = await prisma.stockCount.findMany({
      where,
      select: { bookQuantity: true, countedQuantity: true },
    });

    let totalLoss = 0;
    let totalSurplus = 0;
    for (const count of counts) {
      const difference = count.countedQuantity - count.bookQuantity;
      if (difference < 0) totalLoss -= difference;
      else totalSurplus += difference;
    }

    return apiSuccess({ counts: counts.length, totalLoss, totalSurplus });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/inventory/counts/summary]', error);
    return apiError('Không thể tải tổng hợp kiểm kho', 500);
  }
}
