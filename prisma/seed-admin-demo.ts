/**
 * IceFlow SaaS - Super Admin Demo Seed
 *
 * Creates fake tenant factories with subscriptions for testing the Super Admin UI flow.
 * Run with: npx tsx prisma/seed-admin-demo.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fake tenant factories for demo
const FAKE_TENANTS = [
  {
    name: 'Nhà Máy Đá Biên Hòa',
    phone: '0251 123 456',
    address: '123 Đường 20, KCN Biên Hòa, Đồng Nai',
  },
  {
    name: 'Đá Viên Sài Gòn',
    phone: '028 3456 7890',
    address: '456 Đường 5, KCN Bình Chiểu, TP.HCM',
  },
  {
    name: 'Đá Tinh Khiết Bình Dương',
    phone: '0271 987 654',
    address: '789 KCN Sóng Thần, Bình Dương',
  },
];

async function seedAdminDemo() {
  console.log('='.repeat(50));
  console.log('IceFlow SaaS - Super Admin Demo Seed');
  console.log('='.repeat(50));

  try {
    await prisma.$connect();
    console.log('\nConnected to database');

    // Get or create an admin user for payments
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@iceflow.system';
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!adminUser) {
      console.error('ERROR: SUPER_ADMIN user not found. Run prisma/seed-system-factory.ts first.');
      process.exit(1);
    }
    console.log(`Using admin: ${adminUser.email}`);

    // Check existing tenants to avoid duplicates
    const existingFactories = await prisma.factory.findMany({
      where: { isSystem: false },
    });
    console.log(`\nExisting tenant factories: ${existingFactories.length}`);

    // Create demo data for each fake tenant
    for (const tenant of FAKE_TENANTS) {
      const existing = existingFactories.find(f => f.name === tenant.name);

      if (existing) {
        console.log(`\n[Tenant already exists - skipping] ${tenant.name}`);
        continue;
      }

      console.log(`\n[Creating tenant] ${tenant.name}`);

      // 1. Create factory
      const factory = await prisma.factory.create({
        data: {
          name: tenant.name,
          phone: tenant.phone,
          address: tenant.address,
          isSystem: false,
        },
      });
      console.log(`  - Factory: ${factory.id}`);

      // 2. Create subscription (PAID, 30 days remaining)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const subscription = await prisma.subscription.create({
        data: {
          factoryId: factory.id,
          planType: 'PAID',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: endDate,
          driverCount: 3,
          pricePerDriver: 150000,
        },
      });
      console.log(`  - Subscription: ${subscription.id} (PAID, ${30} days remaining)`);

      // 3. Create drivers (3 per factory)
      const driverNames = ['Nguyễn Văn An', 'Trần Văn Bình', 'Lê Thị Chung'];
      for (const driverName of driverNames) {
        const slug = driverName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
        const driver = await prisma.driver.create({
          data: {
            name: driverName,
            slug: `${slug}-${factory.id.slice(-4)}`,
            phone: `090${Math.floor(1000000 + Math.random() * 9000000)}`,
            factoryId: factory.id,
            isActive: true,
          },
        });
        console.log(`  - Driver: ${driver.name}`);
      }

      // 4. Create a few customers
      const customerNames = [
        { code: `${factory.id.slice(-4)}KH01`, name: 'Cửa Hàng Đá Bình', address: '11 Nguyễn Trãi, Q1', phone: '0903111222' },
        { code: `${factory.id.slice(-4)}KH02`, name: 'Siêu Thị Miền Nam', address: '22 Lê Lợi, Q1', phone: '0903222333' },
      ];
      for (const cust of customerNames) {
        const customer = await prisma.customer.create({
          data: {
            code: cust.code,
            name: cust.name,
            address: cust.address,
            phone: cust.phone,
            factoryId: factory.id,
            isActive: true,
          },
        });
        console.log(`  - Customer: ${customer.name}`);

        // Create 1-2 sample orders per customer
        for (let i = 0; i < 2; i++) {
          const order = await prisma.order.create({
            data: {
              customerId: customer.id,
              factoryId: factory.id,
              status: i === 0 ? 'PENDING' : 'SHIPPING',
              total: 120000,
              notes: i === 0 ? 'Giao buổi sáng' : null,
            },
          });
        }
      }

      // 5. Create a sample payment
      await prisma.payment.create({
        data: {
          factoryId: factory.id,
          adminId: adminUser.id,
          amount: 450000,
          notes: 'Thanh toán tháng 4/2026',
        },
      });
      console.log(`  - Payment recorded`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Demo seed completed!');
    console.log('='.repeat(50));

    // Verify
    const factoryCount = await prisma.factory.count({ where: { isSystem: false } });
    const subCount = await prisma.subscription.count();
    const driverCount = await prisma.driver.count();
    const customerCount = await prisma.customer.count();
    const orderCount = await prisma.order.count();
    const paymentCount = await prisma.payment.count();

    console.log('\nVerification:');
    console.log(`  - Tenant factories: ${factoryCount}`);
    console.log(`  - Subscriptions: ${subCount}`);
    console.log(`  - Drivers: ${driverCount}`);
    console.log(`  - Customers: ${customerCount}`);
    console.log(`  - Orders: ${orderCount}`);
    console.log(`  - Payments: ${paymentCount}`);
    console.log('\nNow refresh /admin/dashboard to see tenant data!');

  } catch (error) {
    console.error('\nSeed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAdminDemo()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
