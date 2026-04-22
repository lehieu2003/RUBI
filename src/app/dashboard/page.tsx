import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

async function getFactory(factoryId: string) {
  return prisma.factory.findUnique({
    where: { id: factoryId },
    select: { onboardingCompleted: true },
  });
}

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
  const [customers, products, orders, session] = await Promise.all([
    getCustomers(),
    getProducts(),
    getOrders(),
    getSession(),
  ]);

  let showOnboardingPrompt = false;
  if (session?.role === 'ADMIN' && session.factoryId) {
    const factory = await getFactory(session.factoryId);
    showOnboardingPrompt = factory?.onboardingCompleted === false;
  }

  return (
    <DashboardClient
      customers={customers}
      products={products}
      orders={orders}
      currentUser={session ? { id: session.userId, role: session.role, factoryId: session.factoryId } : null}
      showOnboardingPrompt={showOnboardingPrompt}
    />
  );
}