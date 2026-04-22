import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { GlobalPricesTable } from '@/components/pricing/global-prices-table';
import { redirect } from 'next/navigation';

export default async function GlobalPricesPage() {
  const session = await getSession();
  if (!session?.factoryId) {
    redirect('/login');
  }

  // Fetch all active products
  const products = await prisma.product.findMany({
    where: { isActive: true, factoryId: session.factoryId },
    orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
  });

  // Fetch all global prices
  const globalPrices = await prisma.globalPrice.findMany();
  const priceMap = new Map<string, number>();
  for (const gp of globalPrices) {
    priceMap.set(gp.productId, Number(gp.pricePerUnit));
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <nav className="text-sm text-gray-500 mb-4">
        <span>Trang chủ</span> › <span>Cấu hình</span> › <span className="text-gray-900">Giá cơ bản</span>
      </nav>

      <h1 className="text-2xl font-bold mb-6">Cấu hình giá cơ bản</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-sm text-gray-600 mb-6">
          Giá cơ bản áp dụng cho tất cả khách hàng. Khách hàng có mức giá riêng sẽ hiển thị giá đã đàm phán thay vì giá này.
        </p>

        <GlobalPricesTable products={products} globalPrices={priceMap} />
      </div>
    </div>
  );
}
