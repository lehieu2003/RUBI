import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';

const prisma = new PrismaClient();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'iceflow-secret-key-change-in-production'
);

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
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'System Administrator',
        password: adminPassword, // In production, use bcrypt hash
        role: 'SUPER_ADMIN',
        factoryId: null, // System-wide access, no factory
        isFactoryOwner: false,
        isActive: true,
      },
    });
    console.log('SUPER_ADMIN created:', adminUser.email);

    // Generate JWT for the SUPER_ADMIN
    const token = await new SignJWT({
      userId: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: 'SUPER_ADMIN',
      factoryId: null,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    console.log('SUPER_ADMIN JWT token:', token);
    console.log('Store this token securely — it provides system-wide access.');
  } else {
    console.log('SUPER_ADMIN already exists:', existingAdmin.email);
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