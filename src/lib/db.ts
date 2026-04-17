import { PrismaClient } from '@prisma/client';
import { getTenantContext } from './tenant';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Base Prisma instance (used for internal operations)
const basePrisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Extended Prisma with automatic tenant filtering
const extendedPrisma = basePrisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        const ctx = getTenantContext();
        // SUPER_ADMIN bypasses factoryId filter (SADM-01, DATA-03)
        if (ctx.role === 'SUPER_ADMIN') return query(args);
        // Apply factoryId filter for tenant-scoped models
        const factoryIdModels = ['Customer', 'Driver', 'Order', 'Product', 'User', 'Subscription'];
        if (factoryIdModels.includes(model)) {
          if (ctx.factoryId) {
            args.where = { ...args.where, factoryId: ctx.factoryId };
          }
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        const ctx = getTenantContext();
        if (ctx.role === 'SUPER_ADMIN') return query(args);
        const factoryIdModels = ['Customer', 'Driver', 'Order', 'Product', 'User', 'Subscription'];
        if (factoryIdModels.includes(model) && ctx.factoryId) {
          args.where = { ...args.where, factoryId: ctx.factoryId };
        }
        return query(args);
      },
      async findUnique({ model, args, query }) {
        const ctx = getTenantContext();
        if (ctx.role === 'SUPER_ADMIN') return query(args);
        const factoryIdModels = ['Customer', 'Driver', 'Order', 'Product', 'User', 'Subscription'];
        if (factoryIdModels.includes(model) && ctx.factoryId) {
          args.where = { ...args.where, factoryId: ctx.factoryId };
        }
        return query(args);
      },
    },
  },
});

export const prisma = extendedPrisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;