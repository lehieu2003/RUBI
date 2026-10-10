import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaAuth } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { verifyJWT } from '@/lib/auth';
import { apiSuccess, apiError } from "@/lib/api-response";

// PATCH /api/orders/[id]/confirm
// Body: optional { token } for the driver share-link flow
// Updates status to DELIVERED

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json().catch(() => null);

    const authHeader = request.headers.get('authorization');
    const bodyToken = typeof body?.token === 'string' ? body.token : null;
    // Bearer JWT (logged-in mobile driver) resolves via the cookie-session
    // path; a non-JWT Bearer value stays a driver share-token (web /d/[token]).
    const bearerSession = authHeader?.startsWith('Bearer ')
      ? await verifyJWT(authHeader.slice(7))
      : null;
    const driver = bearerSession
      ? await getSessionDriver()
      : authHeader?.startsWith('Bearer ')
      ? await prismaAuth.driver.findUnique({ where: { token: authHeader.slice(7) } })
      : bodyToken
      ? await prismaAuth.driver.findUnique({ where: { token: bodyToken } })
      : await getSessionDriver();
    if (!driver) {
      return apiError('Thông tin tài xế không hợp lệ', 401);
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

    // --- Update order to DELIVERED ---
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });

    return apiSuccess({
          success: true,
          orderId: updated.id,
          status: updated.status,
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
