import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireRole } from '@/lib/auth/helpers';
import { GlobalPriceBody } from '@/lib/contracts/prices';
import { apiSuccess, apiError } from "@/lib/api-response";

// GET /api/prices/global — every product with its default price, for the
// manager's "products and prices" screen. Discontinued products are listed
// too, so that one can be put back on sale.
export async function GET() {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const products = await prisma.product.findMany({
      where: { factoryId: session.factoryId },
      select: {
        id: true,
        name: true,
        sizeKg: true,
        unit: true,
        minStock: true,
        isActive: true,
        globalPrices: { select: { pricePerUnit: true } },
      },
      orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
    });

    return apiSuccess(
      products.map(({ globalPrices: globalPrice, ...product }) => ({
        ...product,
        // null: no default price yet, the product cannot be ordered.
        price: globalPrice ? Number(globalPrice.pricePerUnit) : null,
      }))
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/prices/global]', error);
    return apiError('Không thể tải bảng giá', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const body = await request.json();
    const parsed = GlobalPriceBody.safeParse(body);

    if (!parsed.success) {
      return apiError('Yêu cầu không hợp lệ', 400);
    }

    const { productId, price } = parsed.data;

    const product = await prisma.product.findFirst({
      where: { id: productId, factoryId: session.factoryId },
      select: { id: true },
    });
    if (!product) {
      return apiError('Không tìm thấy sản phẩm', 404);
    }

    await prisma.globalPrice.upsert({
      where: { productId },
      update: {
        pricePerUnit: new Prisma.Decimal(price.toFixed(2)),
      },
      create: {
        productId,
        pricePerUnit: new Prisma.Decimal(price.toFixed(2)),
      },
    });

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error setting global price:', error);
    return apiError('Lỗi máy chủ', 500);
  }
}
