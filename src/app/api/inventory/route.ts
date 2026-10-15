import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/helpers';
import { changeStock, isLowStock, outForDelivery, reservedByOpenOrders, stockOnHand } from '@/lib/inventory';
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
    const productIds = products.map((product) => product.id);
    const [inventoryMap, reserved, out] = await Promise.all([
      stockOnHand(prisma, productIds),
      reservedByOpenOrders(prisma, factoryId, productIds),
      outForDelivery(prisma, factoryId, productIds),
    ]);

    const items = products.map(product => {
      const quantityOnHand = inventoryMap.get(product.id) ?? 0;
      // What can still be promised: open orders are on the books until settled.
      const sellable = quantityOnHand - (reserved.get(product.id) ?? 0);
      return {
        productId: product.id,
        productName: product.name,
        sizeKg: product.sizeKg,
        unit: product.unit,
        quantityOnHand,
        totalKg: quantityOnHand * product.sizeKg,
        sellable,
        // On trucks or awaiting settlement: on the books but not in the store.
        outForDelivery: out.get(product.id) ?? 0,
        minStock: product.minStock,
        lowStock: isLowStock(sellable, product.minStock),
      };
    });

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
    // stock count of what is physically inside the cold store.
    const factoryId = session.factoryId;
    const record = await prisma.$transaction(async (tx) => {
      if (mode === 'ADD') {
        return changeStock(tx, productId, { add: quantity });
      }
      // Bags on trucks or awaiting settlement are still on the books (they
      // leave them at settlement) but not in the store. The count is compared
      // with what should be in the store, and they stay on the books so the
      // settlement deducts them once.
      const out = (await outForDelivery(tx, factoryId, [productId])).get(productId) ?? 0;
      const book = (await stockOnHand(tx, [productId])).get(productId) ?? 0;
      const counted = await changeStock(tx, productId, { set: quantity + out });
      // bookQuantity is what should have been in the store, so the
      // difference is the loss or surplus the manager reviews later.
      await tx.stockCount.create({
        data: {
          factoryId,
          productId,
          bookQuantity: book - out,
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
