import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ProductTable } from '@/components/pricing/product-table';
import { redirect } from 'next/navigation';
import { stockOnHand } from '@/lib/inventory';

export default async function ProductsAndPricesPage() {
  const session = await getSession();
  if (!session?.factoryId) {
    redirect('/login');
  }

  // Every product, discontinued ones included, so they can be sold again
  const products = await prisma.product.findMany({
    where: { factoryId: session.factoryId },
    include: { _count: { select: { orderItems: true } } },
    orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
  });

  // Fetch all global prices
  const globalPrices = await prisma.globalPrice.findMany({
    where: { product: { factoryId: session.factoryId } },
  });
  const priceMap = new Map<string, number>();
  for (const gp of globalPrices) {
    priceMap.set(gp.productId, Number(gp.pricePerUnit));
  }

  // What discontinuing a product would leave behind: stock in the cold store
  // and orders that are not settled yet.
  const productIds = products.map((product) => product.id);
  const [stock, openOrderItems] = await Promise.all([
    stockOnHand(prisma, productIds),
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        order: { factoryId: session.factoryId, status: { in: ['PENDING', 'SHIPPING', 'DELIVERED'] } },
      },
      _count: { _all: true },
    }),
  ]);
  const openOrders = new Map(openOrderItems.map((row) => [row.productId, row._count._all]));

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1000px]">
        <div className="mb-6 border-b border-outline-variant pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Sản Phẩm & Bảng Giá Cơ Bản</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Giá cơ bản áp dụng chung cho tất cả khách hàng (đại lý có giá riêng sẽ áp dụng giá riêng).
          </p>
        </div>

        <div className="rounded border border-outline-variant bg-card p-6 shadow-sm">
          <ProductTable
            products={products.map((product) => ({
              id: product.id,
              name: product.name,
              sizeKg: product.sizeKg,
              unit: product.unit,
              minStock: product.minStock,
              isActive: product.isActive,
              price: priceMap.get(product.id) ?? null,
              hasOrders: product._count.orderItems > 0,
              stock: stock.get(product.id) ?? 0,
              openOrders: openOrders.get(product.id) ?? 0,
            }))}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
