import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requireRole } from '@/lib/auth/helpers';
import { CustomerPriceBody } from '@/lib/contracts/prices';
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const body = await request.json();
    const parsed = CustomerPriceBody.safeParse(body);

    if (!parsed.success) {
      return apiError('Yêu cầu không hợp lệ', 400);
    }

    const { customerId, productId, price } = parsed.data;
    const [customer, product] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, factoryId: session.factoryId },
        select: { id: true },
      }),
      prisma.product.findFirst({
        where: { id: productId, factoryId: session.factoryId },
        select: { id: true },
      }),
    ]);
    if (!customer || !product) {
      return apiError('Không tìm thấy khách hàng hoặc sản phẩm', 404);
    }

    await prisma.customerPriceOverride.upsert({
      where: {
        customerId_productId: { customerId, productId },
      },
      update: {
        pricePerUnit: new Prisma.Decimal(price.toFixed(2)),
      },
      create: {
        customerId,
        productId,
        pricePerUnit: new Prisma.Decimal(price.toFixed(2)),
      },
    });

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error setting customer price override:', error);
    return apiError('Lỗi máy chủ', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN']);
    if (!session.factoryId) {
      return apiError('Tài khoản chưa được gán nhà máy', 400);
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const productId = searchParams.get('productId');

    if (!customerId || !productId) {
      return apiError('Thiếu khách hàng hoặc sản phẩm', 400);
    }

    const [customer, product] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, factoryId: session.factoryId },
        select: { id: true },
      }),
      prisma.product.findFirst({
        where: { id: productId, factoryId: session.factoryId },
        select: { id: true },
      }),
    ]);
    if (!customer || !product) {
      return apiError('Không tìm thấy khách hàng hoặc sản phẩm', 404);
    }

    await prisma.customerPriceOverride.deleteMany({
      where: { customerId, productId },
    });

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error removing customer price override:', error);
    return apiError('Lỗi máy chủ', 500);
  }
}
