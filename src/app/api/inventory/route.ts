import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.factoryId) {
      return apiError('Unauthorized', 401);
    }

    const factoryId = session.factoryId;

    // Get all products for this factory
    const products = await prisma.product.findMany({
      where: { factoryId, isActive: true },
      orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
    });

    // Start of today UTC
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get inventory records
    const inventoryRecords = await prisma.inventory.findMany({
      where: {
        product: { factoryId },
        date: { gte: today },
      },
      include: {
        product: true,
      },
    });

    const inventoryMap = new Map(inventoryRecords.map(r => [r.productId, r.quantityOnHand]));

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
    console.error('[GET /api/inventory]', error);
    return apiError('Lỗi tải dữ liệu kho', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.factoryId) {
      return apiError('Unauthorized', 401);
    }

    const body = await req.json();
    const { productId, quantity, mode } = body;

    if (!productId || typeof quantity !== 'number' || quantity < 0) {
      return apiError('Thông tin sản lượng không hợp lệ', 400);
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, factoryId: session.factoryId },
    });

    if (!product) {
      return apiError('Không tìm thấy sản phẩm', 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.inventory.findFirst({
      where: {
        productId,
        date: { gte: today },
      },
    });

    let newQuantity = quantity;
    if (existing) {
      if (mode === 'ADD') {
        newQuantity = existing.quantityOnHand + quantity;
      }
      const updated = await prisma.inventory.update({
        where: { id: existing.id },
        data: { quantityOnHand: newQuantity },
      });
      return apiSuccess(updated);
    } else {
      const created = await prisma.inventory.create({
        data: {
          productId,
          date: today,
          quantityOnHand: quantity,
        },
      });
      return apiSuccess(created);
    }
  } catch (error) {
    console.error('[POST /api/inventory]', error);
    return apiError('Lỗi cập nhật kho', 500);
  }
}
