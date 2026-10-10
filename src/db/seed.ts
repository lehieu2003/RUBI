/**
 * IceFlow - Complete System Seed Script
 *
 * Populates the entire database with realistic data for:
 * 1. The single factory (Nhà máy đá tinh khiết Rubi)
 * 3. Factory Users: Manager (Admin), Staff, Driver
 * 4. Products (Đá Bi, Đá Viên, Đá Cây, Đá Mi) & Global Prices
 * 5. Customers with Customer Price Overrides
 * 6. Customer Debt Ledgers & Shell Deposits (Cược vỏ)
 * 7. Drivers & Schedule Assignments (Ca trực)
 * 8. Inventory snapshots
 * 9. Orders & Order Items in various lifecycle stages
 *
 * Run with: npm run db:seed
 */

import { PrismaClient, Prisma, UserRole, Shift, LedgerType, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Seed data uses a well-known default password, so it must never reach a
// real database. Only local databases are allowed unless explicitly forced.
function assertSafeToSeed() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    host = '';
  }
  const isLocal = ['localhost', '127.0.0.1', '::1', 'postgres'].includes(host);
  if (process.env.NODE_ENV === 'production' || (!isLocal && process.env.SEED_ALLOW_REMOTE !== 'true')) {
    throw new Error(
      `Refusing to seed "${host || 'unknown host'}": demo accounts use the default password 12345678. ` +
        'Seed only local databases. Create the real manager account with `npm run admin:create`.'
    );
  }
}

async function main() {
  assertSafeToSeed();
  console.log('='.repeat(60));
  console.log('🧊 ICEFLOW - SEEDING COMPLETE SYSTEM DATA');
  console.log('='.repeat(60));

  const defaultPassword = await bcrypt.hash('12345678', 10);

  // -------------------------------------------------------------
  // 2. THE FACTORY (Nhà máy đá tinh khiết Rubi)
  // -------------------------------------------------------------
  console.log('\n[2/7] Creating Factory (Nhà máy đá tinh khiết Rubi)...');
  const demoFactory = await prisma.factory.upsert({
    where: { id: 'factory-mien-dong' },
    update: { name: 'Nhà máy đá tinh khiết Rubi' },
    create: {
      id: 'factory-mien-dong',
      name: 'Nhà máy đá tinh khiết Rubi',
      phone: '028 3899 9999',
      address: '128 Xa Lộ Hà Nội, TP. Thủ Đức, TP.HCM',
      onboardingCompleted: true,
    },
  });

  console.log(`  ✓ Factory ready: ${demoFactory.name}`);

  // -------------------------------------------------------------
  // 3. FACTORY USERS (Manager, Staff, Driver)
  // -------------------------------------------------------------
  console.log('\n[3/7] Creating Factory Users (All Roles)...');
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'quanly@rubi.local' },
    update: {}, // never overwrite the password of an existing account
    create: {
      email: 'quanly@rubi.local',
      name: 'Nguyễn Văn Chủ Xưởng',
      phone: '0909111222',
      password: defaultPassword,
      role: UserRole.ADMIN,
      isFactoryOwner: true,
      factoryId: demoFactory.id,
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'nhanvien@miendong.vn' },
    update: {}, // never overwrite the password of an existing account
    create: {
      email: 'nhanvien@miendong.vn',
      name: 'Lê Văn Lên Đơn',
      phone: '0909555666',
      password: defaultPassword,
      role: UserRole.STAFF,
      factoryId: demoFactory.id,
    },
  });

  const driverUser1 = await prisma.user.upsert({
    where: { email: 'taixe1@miendong.vn' },
    update: {}, // never overwrite the password of an existing account
    create: {
      email: 'taixe1@miendong.vn',
      name: 'Phạm Văn Tài (Xe 1)',
      phone: '0909777888',
      password: defaultPassword,
      role: UserRole.DRIVER,
      factoryId: demoFactory.id,
    },
  });

  console.log(`  ✓ Manager (Admin): ${adminUser.email}      | Pass: 12345678`);
  console.log(`  ✓ Order Staff   : ${staffUser.email}   | Pass: 12345678`);
  console.log(`  ✓ Driver User   : ${driverUser1.email}     | Pass: 12345678`);

  // -------------------------------------------------------------
  // 4. DRIVERS & SCHEDULE
  // -------------------------------------------------------------
  console.log('\n[4/7] Setting up Drivers & Shifts...');
  const driver1 = await prisma.driver.upsert({
    where: { slug: 'tai-xe-1-miendong' },
    update: {},
    create: {
      name: 'Phạm Văn Tài',
      slug: 'tai-xe-1-miendong',
      phone: '0909777888',
      factoryId: demoFactory.id,
      userId: driverUser1.id,
      isActive: true,
    },
  });

  const driver2 = await prisma.driver.upsert({
    where: { slug: 'tai-xe-2-miendong' },
    update: {},
    create: {
      name: 'Hoàng Văn Lộc',
      slug: 'tai-xe-2-miendong',
      phone: '0909999000',
      factoryId: demoFactory.id,
      isActive: true,
    },
  });

  // Schedule for driver
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.scheduleAssignment.upsert({
    where: {
      userId_shiftDate_shift: {
        userId: driverUser1.id,
        shiftDate: today,
        shift: Shift.SLOT_06_09,
      },
    },
    update: {},
    create: {
      factoryId: demoFactory.id,
      userId: driverUser1.id,
      shiftDate: today,
      shift: Shift.SLOT_06_09,
    },
  });

  // -------------------------------------------------------------
  // 5. PRODUCTS & GLOBAL PRICES
  // -------------------------------------------------------------
  console.log('\n[5/7] Creating Products & Pricing...');
  const productDefs = [
    { id: 'prod-bi-5', name: 'Đá Bi', sizeKg: 5, unit: 'Bao', price: 12000 },
    { id: 'prod-bi-10', name: 'Đá Bi', sizeKg: 10, unit: 'Bao', price: 22000 },
    { id: 'prod-bi-20', name: 'Đá Bi', sizeKg: 20, unit: 'Bao', price: 40000 },
    { id: 'prod-vien-5', name: 'Đá Viên', sizeKg: 5, unit: 'Bao', price: 15000 },
    { id: 'prod-vien-10', name: 'Đá Viên', sizeKg: 10, unit: 'Bao', price: 28000 },
    { id: 'prod-vien-20', name: 'Đá Viên', sizeKg: 20, unit: 'Bao', price: 52000 },
    { id: 'prod-cay-50', name: 'Đá Cây', sizeKg: 50, unit: 'Cây', price: 35000 },
    { id: 'prod-mi-20', name: 'Đá Mi', sizeKg: 20, unit: 'Bao', price: 30000 },
  ];

  const products: Record<string, string> = {};

  for (const p of productDefs) {
    const prod = await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        sizeKg: p.sizeKg,
        unit: p.unit,
        factoryId: demoFactory.id,
        isActive: true,
      },
    });
    products[p.id] = prod.id;

    await prisma.globalPrice.upsert({
      where: { productId: prod.id },
      update: { pricePerUnit: new Prisma.Decimal(p.price) },
      create: {
        productId: prod.id,
        pricePerUnit: new Prisma.Decimal(p.price),
      },
    });

    // Inventory snapshot
    await prisma.inventory.upsert({
      where: {
        productId_date: {
          productId: prod.id,
          date: today,
        },
      },
      update: { quantityOnHand: 200 },
      create: {
        productId: prod.id,
        date: today,
        quantityOnHand: 200,
      },
    });
  }
  console.log(`  ✓ Created ${productDefs.length} Products with Global Prices & Inventory`);

  // -------------------------------------------------------------
  // 6. CUSTOMERS, OVERRIDES, DEBT & SHELL DEPOSITS
  // -------------------------------------------------------------
  console.log('\n[6/7] Creating Customers, Debt Ledgers & Shell Deposits...');
  const customerDefs = [
    {
      code: 'KH-001',
      name: 'Quán Nhậu Gió Biển',
      phone: '0908123456',
      address: '45 Đường Số 7, P. Linh Trung, Thủ Đức',
      shellsOut: 30,
      shellsIn: 10,
      debt: 1250000,
      override: { prodId: 'prod-bi-20', price: 38000 },
    },
    {
      code: 'KH-002',
      name: 'Đại Lý Nước Ngọt Minh Tâm',
      phone: '0908234567',
      address: '102 Kha Vạn Cân, Hiệp Bình Chánh, Thủ Đức',
      shellsOut: 50,
      shellsIn: 25,
      debt: 3400000,
      override: { prodId: 'prod-bi-10', price: 20000 },
    },
    {
      code: 'KH-003',
      name: 'Cà Phê Sân Vườn Hướng Dương',
      phone: '0908345678',
      address: '78 Võ Văn Ngân, Bình Thọ, Thủ Đức',
      shellsOut: 15,
      shellsIn: 15,
      debt: 0,
    },
    {
      code: 'KH-004',
      name: 'Vựa Hải Sản Năm Căn',
      phone: '0908456789',
      address: '235 Đặng Văn Bi, Trường Thọ, Thủ Đức',
      shellsOut: 40,
      shellsIn: 10,
      debt: 2100000,
      override: { prodId: 'prod-cay-50', price: 32000 },
    },
    {
      code: 'KH-005',
      name: 'Trà Sữa Ding Tea Thủ Đức',
      phone: '0908567890',
      address: '12 Tô Vĩnh Diện, Linh Chiểu, Thủ Đức',
      shellsOut: 10,
      shellsIn: 10,
      debt: 0,
    },
  ];

  const createdCustomers: Record<string, string> = {};

  for (const c of customerDefs) {
    const cust = await prisma.customer.upsert({
      where: {
        code_factoryId: {
          code: c.code,
          factoryId: demoFactory.id,
        },
      },
      update: {},
      create: {
        code: c.code,
        name: c.name,
        phone: c.phone,
        address: c.address,
        factoryId: demoFactory.id,
        isActive: true,
      },
    });
    createdCustomers[c.code] = cust.id;

    // Shell Deposit
    await prisma.customerShellDeposit.upsert({
      where: { customerId: cust.id },
      update: { shellsOut: c.shellsOut, shellsIn: c.shellsIn },
      create: {
        customerId: cust.id,
        shellsOut: c.shellsOut,
        shellsIn: c.shellsIn,
        depositPerShell: new Prisma.Decimal(50000),
      },
    });

    // Debt Ledger (if has debt)
    if (c.debt > 0) {
      await prisma.customerDebtLedger.create({
        data: {
          customerId: cust.id,
          type: LedgerType.DEBT,
          amount: new Prisma.Decimal(c.debt),
          notes: 'Nợ gối đầu tháng trước',
        },
      });
    }

    // Price override
    if (c.override) {
      await prisma.customerPriceOverride.upsert({
        where: {
          customerId_productId: {
            customerId: cust.id,
            productId: c.override.prodId,
          },
        },
        update: { pricePerUnit: new Prisma.Decimal(c.override.price) },
        create: {
          customerId: cust.id,
          productId: c.override.prodId,
          pricePerUnit: new Prisma.Decimal(c.override.price),
        },
      });
    }
  }
  console.log(`  ✓ Created ${customerDefs.length} Customers with Debt & Shell Deposits`);

  // -------------------------------------------------------------
  // 7. ORDERS & DELIVERY LIFECYCLE
  // -------------------------------------------------------------
  console.log('\n[7/7] Creating Sample Orders...');
  const sampleOrders = [
    {
      custCode: 'KH-001',
      status: OrderStatus.SHIPPING,
      driverId: driver1.id,
      notes: 'Giao trước 11h trưa quán mở cửa',
      items: [
        { prodId: 'prod-bi-20', qty: 5, price: 38000 },
        { prodId: 'prod-vien-10', qty: 3, price: 28000 },
      ],
    },
    {
      custCode: 'KH-002',
      status: OrderStatus.PENDING,
      driverId: driver2.id,
      notes: 'Gọi trước khi tới 10 phút',
      items: [
        { prodId: 'prod-bi-10', qty: 10, price: 20000 },
        { prodId: 'prod-bi-5', qty: 5, price: 12000 },
      ],
    },
    {
      custCode: 'KH-003',
      status: OrderStatus.DELIVERED,
      driverId: driver1.id,
      notes: 'Đã thanh toán tiền mặt đủ',
      deliveredAt: new Date(),
      items: [
        { prodId: 'prod-vien-5', qty: 4, price: 15000 },
      ],
    },
    {
      custCode: 'KH-004',
      status: OrderStatus.COMPLETED,
      driverId: driver1.id,
      notes: 'Giao ướp cá',
      deliveredAt: new Date(),
      items: [
        { prodId: 'prod-cay-50', qty: 8, price: 32000 },
        { prodId: 'prod-mi-20', qty: 4, price: 30000 },
      ],
    },
  ];

  for (const o of sampleOrders) {
    const custId = createdCustomers[o.custCode];
    const total = o.items.reduce((sum, i) => sum + i.qty * i.price, 0);

    await prisma.order.create({
      data: {
        customerId: custId,
        factoryId: demoFactory.id,
        driverId: o.driverId,
        assignerId: staffUser.id,
        status: o.status,
        notes: o.notes,
        total: new Prisma.Decimal(total),
        deliveredAt: o.deliveredAt,
        orderItems: {
          create: o.items.map(i => ({
            productId: i.prodId,
            quantity: i.qty,
            unitPrice: new Prisma.Decimal(i.price),
            lineTotal: new Prisma.Decimal(i.qty * i.price),
            actualQty: o.status === OrderStatus.DELIVERED || o.status === OrderStatus.COMPLETED ? i.qty : null,
          })),
        },
      },
    });
  }

  console.log(`  ✓ Created Sample Orders in PENDING, SHIPPING, DELIVERED, COMPLETED states`);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 SEED DATA GENERATION FINISHED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\n🔑 TÀI KHOẢN ĐĂNG NHẬP THỬ NGHIỆM:');
  console.log('┌──────────────────┬──────────────────────────┬───────────┐');
  console.log('│ Vai trò (Role)   │ Email                    │ Password  │');
  console.log('├──────────────────┼──────────────────────────┼───────────┤');
  console.log('│ Quản lý (Admin)  │ quanly@rubi.local        │ 12345678  │');
  console.log('│ Nhân viên lên đơn│ nhanvien@miendong.vn     │ 12345678  │');
  console.log('│ Tài xế giao hàng │ taixe1@miendong.vn       │ 12345678  │');
  console.log('└──────────────────┴──────────────────────────┴───────────┘\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
