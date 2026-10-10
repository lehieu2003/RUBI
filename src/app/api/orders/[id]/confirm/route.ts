import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaAuth } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { apiSuccess, apiError } from "@/lib/api-response";

// PATCH /api/orders/[id]/confirm
// No request body. The signed-in driver must be the one the order is assigned to.
// Updates status to DELIVERED

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // The driver must be signed in: the web cookie or the mobile app's
    // Bearer JWT, both resolved by getSession().
    const driver = await getSessionDriver();
    if (!driver) {
      return apiError('Tài khoản chưa được gắn với tài xế', 401);
    }

    // --- Order ownership check ---
    const order = await prisma.order.findFirst({
      where: { id, factoryId: driver.factoryId },
    });
    if (!order) {
      return apiError('Không tìm thấy đơn hàng', 404);
    }
    if (order.driverId !== driver.id) {
      return apiError('Đơn hàng này không được giao cho bạn', 403);
    }

    // A repeated tap or a retry on an already delivered order changes nothing.
    if (order.status === 'DELIVERED') {
      return apiSuccess({ success: true, orderId: order.id, status: order.status });
    }
    // Only an order out for delivery can be confirmed. Reopening a COMPLETED
    // order would let it be reconciled again: debt and stock counted twice.
    if (order.status !== 'SHIPPING') {
      return apiError('Chỉ xác nhận được đơn đang giao', 409, 'ORDER_NOT_SHIPPING');
    }

    // --- Update order to DELIVERED ---
    // The status is checked again in the write itself, so an order settled or
    // cancelled in the meantime is left alone.
    const updated = await prisma.order.updateMany({
      where: { id, factoryId: driver.factoryId, driverId: driver.id, status: 'SHIPPING' },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });
    if (updated.count === 0) {
      return apiError('Chỉ xác nhận được đơn đang giao', 409, 'ORDER_NOT_SHIPPING');
    }

    return apiSuccess({
          success: true,
          orderId: order.id,
          status: 'DELIVERED',
        });
  } catch (error) {
    if (error instanceof Response) return error;
    // Handle Prisma not found error specifically
    if (error instanceof Error && error.name === 'NotFoundError') {
      return apiError('Không tìm thấy đơn hàng', 404);
    }
    console.error('[PATCH /api/orders/[id]/confirm]', error);
    return apiError('Không thể xác nhận giao hàng', 500);
  }
}

async function getSessionDriver() {
  const session = await requireRole(['DRIVER']);
  if (!session.factoryId) return null;

  return prismaAuth.driver.findFirst({
    where: {
      userId: session.userId,
      factoryId: session.factoryId,
      isActive: true,
      user: { role: 'DRIVER', isActive: true },
    },
  });
}
