/**
 * IceFlow SaaS - Phase 1 Seed Script
 *
 * Populates the database with initial data:
 * - 6 products (Đá Bi/Đá Viên x 5/10/20kg)
 * - 5 customers (KH001-KH005)
 * - Global prices for all products
 * - Customer price overrides for KH001 and KH002 (partial overrides)
 * - 6 sample orders with order items (DRAFT, CONFIRMED, PRINTED, DELIVERED statuses)
 *
 * Run with: npx tsx src/db/seed.ts
 * Or: node --loader tsx src/db/seed.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Product data: 6 SKUs
const PRODUCTS = [
  { name: 'Đá Bi', sizeKg: 5, unit: 'bag' },
  { name: 'Đá Bi', sizeKg: 10, unit: 'bag' },
  { name: 'Đá Bi', sizeKg: 20, unit: 'bag' },
  { name: 'Đá Viên', sizeKg: 5, unit: 'bag' },
  { name: 'Đá Viên', sizeKg: 10, unit: 'bag' },
  { name: 'Đá Viên', sizeKg: 20, unit: 'bag' },
] as const;

// Customer data: 5 wholesale customers in HCMC
const CUSTOMERS = [
  {
    code: 'KH001',
    name: 'Trần Văn Minh',
    address: '123 Nguyễn Trãi, Quận 1, TP.HCM',
    phone: '0903123456',
  },
  {
    code: 'KH002',
    name: 'Lê Thị Hương',
    address: '456 Lê Văn Sỹ, Quận 3, TP.HCM',
    phone: '0907654321',
  },
  {
    code: 'KH003',
    name: 'Phạm Đình Khoa',
    address: '789 Điện Biên Phủ, Quận Bình Thạnh, TP.HCM',
    phone: '0938123456',
  },
  {
    code: 'KH004',
    name: 'Nguyễn Thị Mai',
    address: '321 Võ Văn Ngân, Thủ Đức, TP.HCM',
    phone: '0945123456',
  },
  {
    code: 'KH005',
    name: 'Hoàng Văn Tài',
    address: '654 Cách Mạng Tháng 8, Quận 10, TP.HCM',
    phone: '0952123456',
  },
] as const;

// Global base prices (VND per bag) - reasonable wholesale rates
const GLOBAL_PRICES: Record<string, number> = {
  'Đá Bi-5': 12000,
  'Đá Bi-10': 22000,
  'Đá Bi-20': 40000,
  'Đá Viên-5': 15000,
  'Đá Viên-10': 28000,
  'Đá Viên-20': 52000,
};

// Customer price overrides for KH001 (2 products - Đá Bi 20kg and Đá Viên 10kg get discounts)
const KH001_OVERRIDES: Record<string, number> = {
  'Đá Bi-20': 38000, // discounted from 40000
  'Đá Viên-10': 26000, // discounted from 28000
};

// Customer price overrides for KH002 (3 products)
const KH002_OVERRIDES: Record<string, number> = {
  'Đá Bi-5': 11000, // discounted from 12000
  'Đá Viên-5': 14000, // discounted from 15000
  'Đá Viên-20': 48000, // discounted from 52000
};

async function clearData() {
  console.log('Clearing existing data...');

  // Delete in reverse dependency order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customerPriceOverride.deleteMany();
  await prisma.globalPrice.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();

  console.log('  - OrderItems deleted');
  console.log('  - Orders deleted');
  console.log('  - CustomerPriceOverrides deleted');
  console.log('  - GlobalPrices deleted');
  console.log('  - Products deleted');
  console.log('  - Customers deleted');
}

async function createProducts() {
  console.log('\nCreating 6 products...');

  const createdProducts = [];

  for (const product of PRODUCTS) {
    const created = await prisma.product.create({
      data: {
        name: product.name,
        sizeKg: product.sizeKg,
        unit: product.unit,
        isActive: true,
      },
    });
    createdProducts.push(created);
    console.log(`  - ${created.name} ${created.sizeKg}kg (${created.id})`);
  }

  return createdProducts;
}

async function createCustomers() {
  console.log('\nCreating 5 customers...');

  const createdCustomers = [];

  for (const customer of CUSTOMERS) {
    const created = await prisma.customer.create({
      data: {
        code: customer.code,
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        isActive: true,
      },
    });
    createdCustomers.push(created);
    console.log(`  - ${created.code}: ${created.name} (${created.id})`);
  }

  return createdCustomers;
}

async function createGlobalPrices(products: Awaited<ReturnType<typeof createProducts>>) {
  console.log('\nSetting global base prices...');

  for (const product of products) {
    const priceKey = `${product.name}-${product.sizeKg}`;
    const pricePerUnit = GLOBAL_PRICES[priceKey];

    if (pricePerUnit === undefined) {
      throw new Error(`No global price defined for ${priceKey}`);
    }

    await prisma.globalPrice.create({
      data: {
        productId: product.id,
        pricePerUnit: new Prisma.Decimal(pricePerUnit),
      },
    });

    console.log(`  - ${product.name} ${product.sizeKg}kg: ${pricePerUnit.toLocaleString()}đ`);
  }
}

async function createCustomerOverrides(
  customers: Awaited<ReturnType<typeof createCustomers>>,
  products: Awaited<ReturnType<typeof createProducts>>
) {
  console.log('\nSetting customer price overrides...');

  const productMap = Object.fromEntries(products.map((p) => [`${p.name}-${p.sizeKg}`, p]));

  // KH001 overrides
  const kh001 = customers.find((c) => c.code === 'KH001')!;
  for (const [priceKey, pricePerUnit] of Object.entries(KH001_OVERRIDES)) {
    const product = productMap[priceKey];
    if (!product) throw new Error(`Product not found: ${priceKey}`);

    await prisma.customerPriceOverride.create({
      data: {
        customerId: kh001.id,
        productId: product.id,
        pricePerUnit: new Prisma.Decimal(pricePerUnit),
      },
    });
    console.log(`  - ${kh001.code}: ${priceKey} = ${pricePerUnit.toLocaleString()}đ (override)`);
  }

  // KH002 overrides
  const kh002 = customers.find((c) => c.code === 'KH002')!;
  for (const [priceKey, pricePerUnit] of Object.entries(KH002_OVERRIDES)) {
    const product = productMap[priceKey];
    if (!product) throw new Error(`Product not found: ${priceKey}`);

    await prisma.customerPriceOverride.create({
      data: {
        customerId: kh002.id,
        productId: product.id,
        pricePerUnit: new Prisma.Decimal(pricePerUnit),
      },
    });
    console.log(`  - ${kh002.code}: ${priceKey} = ${pricePerUnit.toLocaleString()}đ (override)`);
  }
}

// Order status type
type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PRINTED' | 'DELIVERED';

// Sample orders data
const SAMPLE_ORDERS = [
  {
    customerCode: 'KH001',
    status: 'DRAFT' as OrderStatus,
    items: [
      { productKey: 'Đá Bi-10', quantity: 5 },
      { productKey: 'Đá Bi-5', quantity: 3 },
    ],
    notes: 'Giao buổi sáng',
  },
  {
    customerCode: 'KH002',
    status: 'CONFIRMED' as OrderStatus,
    items: [
      { productKey: 'Đá Viên-10', quantity: 4 },
    ],
    notes: null,
  },
  {
    customerCode: 'KH003',
    status: 'PRINTED' as OrderStatus,
    items: [
      { productKey: 'Đá Bi-20', quantity: 10 },
      { productKey: 'Đá Viên-5', quantity: 5 },
    ],
    notes: 'Khách hàng VIP',
  },
  {
    customerCode: 'KH004',
    status: 'DELIVERED' as OrderStatus,
    items: [
      { productKey: 'Đá Bi-5', quantity: 2 },
    ],
    notes: null,
  },
  {
    customerCode: 'KH005',
    status: 'DELIVERED' as OrderStatus,
    items: [
      { productKey: 'Đá Bi-10', quantity: 8 },
      { productKey: 'Đá Viên-20', quantity: 3 },
    ],
    notes: 'Thanh toán cuối tháng',
  },
  {
    customerCode: 'KH001',
    status: 'DRAFT' as OrderStatus,
    items: [
      { productKey: 'Đá Bi-5', quantity: 6 },
    ],
    notes: 'Đơn hàng bổ sung',
  },
];

async function createOrders(
  customers: Awaited<ReturnType<typeof createCustomers>>,
  products: Awaited<ReturnType<typeof createProducts>>
) {
  console.log('\nCreating sample orders...');

  const customerMap = Object.fromEntries(customers.map((c) => [c.code, c]));
  const productMap = Object.fromEntries(products.map((p) => [`${p.name}-${p.sizeKg}`, p]));

  // Get global prices for calculating totals
  const globalPrices = await prisma.globalPrice.findMany();
  const priceMap = Object.fromEntries(
    globalPrices.map((gp) => [gp.productId, gp.pricePerUnit.toNumber()])
  );

  // Also get customer overrides
  const overrides = await prisma.customerPriceOverride.findMany();
  const overrideMap = new Map<string, number>();
  for (const ov of overrides) {
    overrideMap.set(`${ov.customerId}-${ov.productId}`, ov.pricePerUnit.toNumber());
  }

  let orderCount = 0;
  for (const orderData of SAMPLE_ORDERS) {
    const customer = customerMap[orderData.customerCode];
    if (!customer) throw new Error(`Customer not found: ${orderData.customerCode}`);

    // Build order items and calculate total
    const orderItemsData: Array<{
      productId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }> = [];

    let orderTotal = 0;
    for (const item of orderData.items) {
      const product = productMap[item.productKey];
      if (!product) throw new Error(`Product not found: ${item.productKey}`);

      // Check for customer override first, then global price
      const overrideKey = `${customer.id}-${product.id}`;
      const unitPrice = overrideMap.has(overrideKey)
        ? overrideMap.get(overrideKey)!
        : priceMap[product.id];

      const lineTotal = unitPrice * item.quantity;
      orderTotal += lineTotal;

      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(unitPrice),
        lineTotal: new Prisma.Decimal(lineTotal),
      });
    }

    // Create the order
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: orderData.status,
        total: new Prisma.Decimal(orderTotal),
        notes: orderData.notes,
        orderItems: {
          create: orderItemsData,
        },
      },
    });

    orderCount++;
    console.log(`  - Order ${order.id} (${orderData.status}): ${orderData.customerCode} - ${orderTotal.toLocaleString()}đ`);
  }

  console.log(`  Total orders created: ${orderCount}`);
}

export async function seed() {
  console.log('='.repeat(50));
  console.log('IceFlow SaaS - Phase 1 Seed');
  console.log('='.repeat(50));

  try {
    // Connect to database
    await prisma.$connect();
    console.log('\nConnected to database');

    // Clear existing data
    await clearData();

    // Create data
    const products = await createProducts();
    const customers = await createCustomers();
    await createGlobalPrices(products);
    await createCustomerOverrides(customers, products);
    await createOrders(customers, products);

    console.log('\n' + '='.repeat(50));
    console.log('Seed completed successfully!');
    console.log('='.repeat(50));

    // Verify data
    const productCount = await prisma.product.count();
    const customerCount = await prisma.customer.count();
    const globalPriceCount = await prisma.globalPrice.count();
    const overrideCount = await prisma.customerPriceOverride.count();
    const orderCount = await prisma.order.count();
    const orderItemCount = await prisma.orderItem.count();

    console.log('\nVerification:');
    console.log(`  - Products: ${productCount}/6`);
    console.log(`  - Customers: ${customerCount}/5`);
    console.log(`  - Global Prices: ${globalPriceCount}/6`);
    console.log(`  - Customer Overrides: ${overrideCount}/5`);
    console.log(`  - Orders: ${orderCount}/6`);
    console.log(`  - Order Items: ${orderItemCount}/9`);
  } catch (error) {
    console.error('\nSeed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if executed directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
