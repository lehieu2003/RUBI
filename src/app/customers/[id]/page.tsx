import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
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
  // Prices are set by the manager only; the price API refuses everyone else.
  if (session.role !== 'ADMIN') {
    redirect('/customers');
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
    <DashboardLayout>
    <div className="max-w-2xl py-8 px-4 sm:px-6 lg:px-8">
      <nav className="text-sm text-faint mb-4">
        <Link href="/customers" className="hover:text-primary-accent">Khách hàng</Link> › <span className="text-on-surface">{customer.name}</span> › <span className="text-on-surface">Bảng giá</span>
      </nav>

      {/* Customer header */}
      <div className="bg-card rounded-lg border border-outline-variant p-6 mb-6">
        <h1 className="text-xl font-bold mb-4">{customer.name}</h1>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-faint">Mã khách hàng:</span>
            <span className="ml-2 font-mono">{customer.code}</span>
          </div>
          <div>
            <span className="text-faint">Số điện thoại:</span>
            <span className="ml-2">{customer.phone}</span>
          </div>
          <div className="col-span-2">
            <span className="text-faint">Địa chỉ:</span>
            <span className="ml-2">{customer.address}</span>
          </div>
        </div>
      </div>

      {/* Price table */}
      <div className="bg-card rounded-lg border border-outline-variant p-6">
        <h2 className="text-lg font-semibold mb-4">Bảng giá cho {customer.name}</h2>
        <p className="text-sm text-on-surface-variant mb-6">
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
    </DashboardLayout>
  );
}
