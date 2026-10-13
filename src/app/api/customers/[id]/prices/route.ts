import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { loadCustomerPrices, loadSellableStock } from '@/lib/actions/orders';
import { apiSuccess, apiError } from '@/lib/api-response';

// GET /api/customers/[id]/prices — what the order form needs once a customer
// is picked: every product on sale with this customer's price and what is
// left to sell. Same sources as the web order drawer.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(['ADMIN', 'STAFF']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }
    const factoryId = session.factoryId;

    const { id } = await params;
    const customer = await prisma.customer.findFirst({ where: { id, factoryId }, select: { id: true } });
    if (!customer) {
      return apiError('Không tìm thấy khách hàng', 404);
    }

    const [products, prices, sellable] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, factoryId },
        select: { id: true, name: true, sizeKg: true, unit: true },
        orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
      }),
      loadCustomerPrices(id),
      loadSellableStock(),
    ]);

    return apiSuccess(
      products.map((product) => ({
        productId: product.id,
        name: product.name,
        sizeKg: product.sizeKg,
        unit: product.unit,
        // null: no price set yet, the product cannot be ordered.
        price: prices[product.id] ?? null,
        // null: the product never had a stock record, nothing is known.
        sellable: sellable[product.id] ?? null,
      }))
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/customers/[id]/prices]', error);
    return apiError('Không thể tải bảng giá của khách', 500);
  }
}
