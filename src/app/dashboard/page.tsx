import { prisma } from '@/lib/db';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

async function getCustomers() {
  return prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

async function getProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
  });
}

async function getOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      orderItems: {
        include: { product: true },
      },
    },
    take: 50,
  });
}

export default async function DashboardPage() {
  const [customers, products, orders] = await Promise.all([
    getCustomers(),
    getProducts(),
    getOrders(),
  ]);

  return <DashboardClient customers={customers} products={products} orders={orders} />;
}
