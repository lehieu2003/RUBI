import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireRole, requireSession } from '@/lib/auth/helpers';
import { CreateProductBody } from '@/lib/contracts/products';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await requireSession();
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const products = await prisma.product.findMany({
      where: { isActive: true, factoryId: session.factoryId },
      orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
    });
    return apiSuccess(products);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/products]', error);
    return apiError('Không thể tải danh sách sản phẩm', 500);
  }
}

// POST /api/products — the manager adds a product. Its default price is
// required in the same request: a product without a price cannot be ordered.
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const parsed = CreateProductBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ', 400);
    }
    const { name, sizeKg, unit, price, minStock } = parsed.data;

    // Discontinued products count too: reactivating one keeps its history.
    const duplicate = await prisma.product.findFirst({
      where: { factoryId: session.factoryId, sizeKg, name: { equals: name, mode: 'insensitive' } },
      select: { isActive: true },
    });
    if (duplicate) {
      return apiError(
        duplicate.isActive
          ? `Đã có sản phẩm ${name} ${sizeKg}kg`
          : `Sản phẩm ${name} ${sizeKg}kg đang ngừng bán. Hãy bấm "Bán lại" thay vì tạo mới.`,
        409,
        'PRODUCT_EXISTS'
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        sizeKg,
        unit: unit ?? 'Bao',
        minStock: minStock ?? null,
        factoryId: session.factoryId,
        globalPrices: { create: { pricePerUnit: new Prisma.Decimal(price.toFixed(2)) } },
      },
    });

    return apiSuccess(product, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/products]', error);
    return apiError('Không thể thêm sản phẩm', 500);
  }
}
