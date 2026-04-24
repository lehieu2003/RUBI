import { prisma, prismaAuth } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { redirect } from 'next/navigation';

async function getFactory(factoryId: string) {
  return prismaAuth.factory.findUnique({
    where: { id: factoryId },
    select: { onboardingCompleted: true },
  });
}

async function getCustomers(factoryId: string) {
  return prisma.customer.findMany({
    where: { isActive: true, factoryId },
    orderBy: { name: 'asc' },
  });
}

async function getProducts(factoryId: string) {
  return prisma.product.findMany({
    where: { isActive: true, factoryId },
    orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
  });
}

async function getOrders(factoryId: string) {
  return prisma.order.findMany({
    where: { factoryId },
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
  const session = await getSession();

  if (!session?.factoryId) {
    redirect('/login');
  }

  const [customers, products, orders] = await Promise.all([
    getCustomers(session.factoryId),
    getProducts(session.factoryId),
    getOrders(session.factoryId),
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
      orders={orders.map(order => ({ ...order, total: order.total.toString() }))}
      currentUser={session ? { id: session.userId, role: session.role, factoryId: session.factoryId } : null}
      showOnboardingPrompt={showOnboardingPrompt}
    />
  );
}
