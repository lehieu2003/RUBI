import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth/helpers';
import { CreateCustomerBody } from '@/lib/contracts/customers';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'STAFF']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';

    if (countOnly) {
      const count = await prisma.customer.count({ where: { isActive: true, factoryId: session.factoryId } });
      return apiSuccess({ count });
    }

    const customers = await prisma.customer.findMany({
      where: { isActive: true, factoryId: session.factoryId },
      orderBy: { name: 'asc' },
    });
    return apiSuccess(customers);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[GET /api/customers]', error);
    return apiError('Không thể tải danh sách khách hàng', 500);
  }
}

// POST /api/customers - Add new customer (ADMIN only, allows inactive)
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const parsed = CreateCustomerBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ', 400);
    }
    const { code, name, address, phone, isActive = true } = parsed.data;

    const duplicate = await prisma.customer.findFirst({
      where: { code, factoryId: session.factoryId },
      select: { id: true },
    });
    if (duplicate) {
      return apiError(`Mã khách hàng "${code}" đã tồn tại`, 409);
    }

    const customer = await prisma.customer.create({
      data: { code, name, address: address || '', phone: phone || '', isActive, factoryId: session.factoryId },
    });

    return apiSuccess(customer);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[POST /api/customers]', error);
    return apiError('Không thể tạo khách hàng', 500);
  }
}
