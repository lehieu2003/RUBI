import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { redirect } from 'next/navigation';
import { startOfVietnamToday } from '@/lib/vietnam-time';
import { stockOnHand } from '@/lib/inventory';

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

// Every order of today, in the few fields the KPI cards and the hourly chart
// need. The recent-orders list is capped at 50, so it cannot feed the totals:
// the factory takes 50-100 orders a day.
async function getTodayOrders(factoryId: string) {
  return prisma.order.findMany({
    where: { factoryId, createdAt: { gte: startOfVietnamToday() } },
    select: { createdAt: true, total: true, status: true },
    orderBy: { createdAt: 'asc' },
  });
}

async function getInventoryStats(factoryId: string) {
  // Same running balance as the cold-storage screen.
  const products = await prisma.product.findMany({
    where: { isActive: true, factoryId },
    orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
  });
  const stock = await stockOnHand(prisma, products.map((product) => product.id));
  const records = products.filter((product) => stock.has(product.id));
  const totalBags = records.reduce((sum, product) => sum + stock.get(product.id)!, 0);
  const details = records.length > 0
    ? records.map((product) => `${product.name} ${product.sizeKg}kg: ${stock.get(product.id)}`).join(' | ')
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
  const startOfToday = startOfVietnamToday();
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  const yesterdayOrders = await prisma.order.findMany({
    where: {
      factoryId,
      createdAt: { gte: startOfYesterday, lt: startOfToday },
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
    todayOrders,
    inventoryStats,
    totalBagsOut,
    yesterdayRevenue,
    dueAssets,
  ] = await Promise.all([
    getCustomers(session.factoryId),
    getProducts(session.factoryId),
    getOrders(session.factoryId),
    getTodayOrders(session.factoryId),
    getInventoryStats(session.factoryId),
    getShellDepositStats(session.factoryId),
    getYesterdayRevenue(session.factoryId),
    getDueMaintenance(session.factoryId),
  ]);

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
      todayOrders={todayOrders.map((order) => ({ ...order, total: order.total.toNumber() }))}
      inventoryStats={inventoryStats}
      totalBagsOut={totalBagsOut}
      yesterdayRevenue={yesterdayRevenue}
      dueAssets={dueAssets.map((r) => ({
        assetName: r.asset.name,
        assetCode: r.asset.code,
        type: r.type as string,
        dueAt: (r.dueAt as Date).toISOString(),
      }))}
    />
  );
}
