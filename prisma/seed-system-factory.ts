import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedSystemFactory() {
  console.log('Seeding System Factory + SUPER_ADMIN user...');

  // 1. Create System factory if not exists (idempotent)
  const systemFactory = await prisma.factory.upsert({
    where: { id: 'sys-default-factory' },
    update: {},
    create: {
      id: 'sys-default-factory',
      name: 'System Factory',
      isSystem: true,
      phone: null,
      address: null,
    },
  });
  console.log('System factory:', systemFactory.id);

  // 2. Create SUPER_ADMIN user if not exists (no factoryId — system-wide)
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@iceflow.system';
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'change-me-immediately';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'System Administrator',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        factoryId: null,
        isFactoryOwner: false,
        isActive: true,
      },
    });
    console.log('SUPER_ADMIN created:', adminUser.email);

    console.log('SUPER_ADMIN user ready:', adminUser.email);
    console.log('System factory seeding complete.');
  } else {
    // Ensure password is hashed (re-hash if stored as plaintext)
    const isHashed = existingAdmin.password.startsWith('$2');
    if (!isHashed) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { password: hashedPassword },
      });
      console.log('SUPER_ADMIN password hashed:', existingAdmin.email);
    } else {
      console.log('SUPER_ADMIN already exists:', existingAdmin.email);
    }
  }

  // 3. Create TRIAL subscription for System factory (so it can be activated)
  const existingSub = await prisma.subscription.findFirst({
    where: { factoryId: systemFactory.id },
  });
  if (!existingSub) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial
    await prisma.subscription.create({
      data: {
        factoryId: systemFactory.id,
        planType: 'TRIAL',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: trialEnd,
        driverCount: 0,
        pricePerDriver: null,
      },
    });
    console.log('TRIAL subscription created for System factory (14 days)');
  }

  console.log('System factory seeding complete.');
}

seedSystemFactory()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

export { seedSystemFactory };