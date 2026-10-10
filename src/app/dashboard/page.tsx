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

async function getInventoryStats(factoryId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const records = await prisma.inventory.findMany({
    where: {
      product: { factoryId },
      date: { gte: today },
    },
    include: { product: true },
  });
  const totalBags = records.reduce((sum, r) => sum + r.quantityOnHand, 0);
  const details = records.length > 0
    ? records.map(r => `${r.product.name} ${r.product.sizeKg}kg: ${r.quantityOnHand}`).join(' | ')
    : 'Chưa có mẻ nhập kho';
  return { totalBags, details };
}

async function getShellDepositStats(factoryId: string) {
  const deposits = await prisma.customerShellDeposit.findMany({
    where: { customer: { factoryId } },
  });
  const totalBagsOut = deposits.reduce((sum, d) => sum + Math.max(0, d.shellsOut - d.shellsIn), 0);
  return totalBagsOut;
}

async function getYesterdayRevenue(factoryId: string) {
  const startOfYesterday = new Date();
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  startOfYesterday.setHours(0, 0, 0, 0);
  const endOfYesterday = new Date();
  endOfYesterday.setDate(endOfYesterday.getDate() - 1);
  endOfYesterday.setHours(23, 59, 59, 999);

  const yesterdayOrders = await prisma.order.findMany({
    where: {
      factoryId,
      createdAt: { gte: startOfYesterday, lte: endOfYesterday },
    },
    select: { total: true },
  });
  return yesterdayOrders.reduce((sum, o) => sum + Number(o.total), 0);
}

// Assets with a maintenance/inspection/insurance due date in the next 30 days
async function getDueMaintenance(factoryId: string) {
  return prisma.maintenanceRecord.findMany({
    where: {
      factoryId,
      dueAt: { not: null, lte: new Date(Date.now() + 30 * 86400000) },
    },
    orderBy: { dueAt: 'asc' },
    take: 5,
    include: { asset: { select: { name: true, code: true } } },
  });
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.factoryId) {
    redirect('/login');
  }

  const [
    customers,
    products,
    orders,
    inventoryStats,
    totalBagsOut,
    yesterdayRevenue,
    dueAssets,
  ] = await Promise.all([
    getCustomers(session.factoryId),
    getProducts(session.factoryId),
    getOrders(session.factoryId),
    getInventoryStats(session.factoryId),
    getShellDepositStats(session.factoryId),
    getYesterdayRevenue(session.factoryId),
    getDueMaintenance(session.factoryId),
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
      orders={orders.map((order) => ({
        ...order,
        total: order.total.toString(),
        orderItems: order.orderItems.map((item) => ({
          ...item,
          unitPrice: item.unitPrice.toString(),
          lineTotal: item.lineTotal.toString(),
        })),
      }))}
      inventoryStats={inventoryStats}
      totalBagsOut={totalBagsOut}
      yesterdayRevenue={yesterdayRevenue}
      showOnboardingPrompt={showOnboardingPrompt}
      dueAssets={dueAssets.map((r) => ({
        assetName: r.asset.name,
        assetCode: r.asset.code,
        type: r.type as string,
        dueAt: (r.dueAt as Date).toISOString(),
      }))}
    />
  );
}
