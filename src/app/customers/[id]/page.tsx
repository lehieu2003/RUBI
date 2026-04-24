import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { CustomerPriceForm } from '@/components/pricing/customer-price-form';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.factoryId) {
    redirect('/login');
  }

  // Fetch customer
  const customer = await prisma.customer.findFirst({
    where: { id, factoryId: session.factoryId },
  });

  if (!customer) {
    notFound();
  }

  // Fetch all active products
  const products = await prisma.product.findMany({
    where: { isActive: true, factoryId: session.factoryId },
    orderBy: [{ name: 'asc' }, { sizeKg: 'asc' }],
  });

  // Fetch global prices
  const globalPrices = await prisma.globalPrice.findMany({
    where: { product: { factoryId: session.factoryId } },
  });
  const globalPriceMap = new Map<string, number>();
  for (const gp of globalPrices) {
    globalPriceMap.set(gp.productId, Number(gp.pricePerUnit));
  }

  // Fetch customer's override prices
  const overridePrices = await prisma.customerPriceOverride.findMany({
    where: {
      customerId: id,
      customer: { factoryId: session.factoryId },
      product: { factoryId: session.factoryId },
    },
  });
  const overrideMap = new Map<string, number>();
  for (const op of overridePrices) {
    overrideMap.set(op.productId, Number(op.pricePerUnit));
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <nav className="text-sm text-gray-500 mb-4">
        <span>Trang chủ</span> › <span>Khách hàng</span> › <span className="text-gray-900">{customer.name}</span> › <span className="text-gray-900">Bảng giá</span>
      </nav>

      {/* Customer header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h1 className="text-xl font-bold mb-4">{customer.name}</h1>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Mã khách hàng:</span>
            <span className="ml-2 font-mono">{customer.code}</span>
          </div>
          <div>
            <span className="text-gray-500">Số điện thoại:</span>
            <span className="ml-2">{customer.phone}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Địa chỉ:</span>
            <span className="ml-2">{customer.address}</span>
          </div>
        </div>
      </div>

      {/* Price table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Bảng giá cho {customer.name}</h2>
        <p className="text-sm text-gray-600 mb-6">
          Giá riêng (màu xanh) ghi đè giá cơ bản. Xóa giá riêng để quay về giá cơ bản.
        </p>
        <CustomerPriceForm
          customer={customer}
          products={products}
          globalPrices={globalPriceMap}
          overridePrices={overrideMap}
        />
      </div>
    </div>
  );
}
