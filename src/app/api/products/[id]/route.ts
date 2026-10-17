import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { UpdateProductBody } from '@/lib/contracts/products';
import { apiSuccess, apiError } from "@/lib/api-response";

// PATCH /api/products/[id] — rename, change unit or size, stop or resume selling.
// There is no DELETE: orders, prices and stock records keep pointing at the
// product, so it is taken off sale with isActive instead.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const { id } = await params;
    const parsed = UpdateProductBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ', 400);
    }
    const changes = parsed.data;

    const existing = await prisma.product.findFirst({
      where: { id, factoryId: session.factoryId },
      select: { id: true, name: true, sizeKg: true, _count: { select: { orderItems: true } } },
    });
    if (!existing) {
      return apiError('Không tìm thấy sản phẩm', 404);
    }

    // Past orders and delivery slips were written for this size.
    if (changes.sizeKg !== undefined && changes.sizeKg !== existing.sizeKg && existing._count.orderItems > 0) {
      return apiError(
        'Sản phẩm đã có đơn hàng nên không đổi được cỡ bao. Hãy tạo sản phẩm mới với cỡ mới.',
        409,
        'PRODUCT_HAS_ORDERS'
      );
    }

    const name = changes.name ?? existing.name;
    const sizeKg = changes.sizeKg ?? existing.sizeKg;
    if (name !== existing.name || sizeKg !== existing.sizeKg) {
      const duplicate = await prisma.product.findFirst({
        where: { factoryId: session.factoryId, id: { not: id }, sizeKg, name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
      });
      if (duplicate) {
        return apiError(`Đã có sản phẩm ${name} ${sizeKg}kg`, 409, 'PRODUCT_EXISTS');
      }
    }

    // The unique (factory, name, size) constraint catches a rename racing past the check above.
    const product = await prisma.product
      .update({
        where: { id },
        data: changes,
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null;
        throw error;
      });
    if (!product) {
      return apiError(`Đã có sản phẩm ${name} ${sizeKg}kg`, 409, 'PRODUCT_EXISTS');
    }

    return apiSuccess(product);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[PATCH /api/products/[id]]', error);
    return apiError('Không thể cập nhật sản phẩm', 500);
  }
}
