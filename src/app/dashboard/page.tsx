import { prisma, prismaAuth } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { setTenantContext } from '@/lib/tenant';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

async function getFactory(factoryId: string) {
  return prismaAuth.factory.findUnique({
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
  const session = await getSession();

  // Set tenant context for this request (propagates to Prisma $extends hooks)
  if (session) {
    setTenantContext(session.factoryId ?? null, session.role as 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'SUPER_ADMIN' | null);
  }

  const [customers, products, orders] = await Promise.all([
    getCustomers(),
    getProducts(),
    getOrders(),
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