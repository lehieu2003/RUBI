import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/helpers';
import { changeStock, stockOnHand } from '@/lib/inventory';
import { apiSuccess, apiError } from '@/lib/api-response';

const RecordSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0),
  mode: z.enum(['ADD', 'SET']).optional(),
  note: z.string().trim().max(200).optional(),
});

export async function GET() {
  try {
    // The cold-storage screen is manager-only, and so is its API.
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const factoryId = session.factoryId;

    // Get all products for this factory
    const products = await prisma.product.findMany({
      where: { factoryId, isActive: true },
      orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
    });

    // Running balance: yesterday's closing stock carries over to today.
    const inventoryMap = await stockOnHand(prisma, products.map((product) => product.id));

    const items = products.map(product => ({
      productId: product.id,
      productName: product.name,
      sizeKg: product.sizeKg,
      unit: product.unit,
      quantityOnHand: inventoryMap.get(product.id) ?? 0,
      totalKg: (inventoryMap.get(product.id) ?? 0) * product.sizeKg,
    }));

    return apiSuccess({
      items,
      totalBags: items.reduce((sum, i) => sum + i.quantityOnHand, 0),
      totalKg: items.reduce((sum, i) => sum + i.totalKg, 0),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/inventory]', error);
    return apiError('Lỗi tải dữ liệu kho', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    // The cold-storage screen is manager-only, and so is its API.
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const parsed = RecordSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return apiError('Thông tin sản lượng không hợp lệ', 400);
    }
    const { productId, quantity, mode, note } = parsed.data;

    const product = await prisma.product.findFirst({
      where: { id: productId, factoryId: session.factoryId },
    });

    if (!product) {
      return apiError('Không tìm thấy sản phẩm', 404);
    }

    // ADD records a batch coming out of production; SET (the default) is a
    // stock count: the counted quantity replaces the balance.
    const factoryId = session.factoryId;
    const record = await prisma.$transaction(async (tx) => {
      if (mode === 'ADD') {
        return changeStock(tx, productId, { add: quantity });
      }
      // Keep what the books said next to what was counted: the difference
      // is the loss or surplus the manager reviews later.
      const bookQuantity = (await stockOnHand(tx, [productId])).get(productId) ?? 0;
      const counted = await changeStock(tx, productId, { set: quantity });
      await tx.stockCount.create({
        data: {
          factoryId,
          productId,
          bookQuantity,
          countedQuantity: quantity,
          note: note || null,
          countedById: session.userId,
        },
      });
      return counted;
    });
    return apiSuccess(record);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/inventory]', error);
    return apiError('Lỗi cập nhật kho', 500);
  }
}
