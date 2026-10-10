import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { OrderDetailClient } from './order-detail-client';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();

  if (!session?.factoryId) {
    return { title: 'Chi tiết đơn hàng | Nhà máy đá tinh khiết Rubi' };
  }

  const order = await prisma.order.findFirst({
    where: { id, factoryId: session.factoryId },
    select: { id: true, customer: { select: { name: true } } },
  });

  if (!order) {
    return { title: 'Không tìm thấy đơn hàng | Nhà máy đá tinh khiết Rubi' };
  }

  const code = `DH-${order.id.slice(-6).toUpperCase()}`;
  return {
    title: `Đơn hàng ${code} — ${order.customer.name}`,
    description: `Chi tiết và in phiếu giao hàng cho đơn ${code}`,
  };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.factoryId) {
    redirect('/login');
  }

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, factoryId: session.factoryId },
    include: {
      customer: true,
      orderItems: {
        include: { product: true },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const serializedOrder = {
    ...order,
    total: Number(order.total),
    createdAt: order.createdAt.toISOString(),
    orderItems: order.orderItems.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
  };

  return <OrderDetailClient order={serializedOrder} />;
}