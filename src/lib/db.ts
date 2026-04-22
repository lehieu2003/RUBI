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
        if (ctx.role === 'SUPER_ADMIN') return query(args);
        const factoryIdModels = ['Customer', 'Driver', 'Order', 'Product', 'User', 'Subscription'];
        if (factoryIdModels.includes(model)) {
          if (!ctx.factoryId) {
            throw new Error(
              `TENANT_ACCESS_DENIED: ${model} query requires factoryId context. ` +
              `Ensure setTenantContext() was called in middleware.`
            );
          }
          args.where = { ...args.where, factoryId: ctx.factoryId };
        }
        return query(args);
      },
      async findFirst({ model, args, query }) {
        const ctx = getTenantContext();
        if (ctx.role === 'SUPER_ADMIN') return query(args);
        const factoryIdModels = ['Customer', 'Driver', 'Order', 'Product', 'User', 'Subscription'];
        if (factoryIdModels.includes(model)) {
          if (!ctx.factoryId) {
            throw new Error(
              `TENANT_ACCESS_DENIED: ${model} query requires factoryId context. ` +
              `Ensure setTenantContext() was called in middleware.`
            );
          }
          args.where = { ...args.where, factoryId: ctx.factoryId };
        }
        return query(args);
      },
      async findUnique({ model, args, query }) {
        const ctx = getTenantContext();
        if (ctx.role === 'SUPER_ADMIN') return query(args);
        const factoryIdModels = ['Customer', 'Driver', 'Order', 'Product', 'User', 'Subscription'];
        if (factoryIdModels.includes(model)) {
          if (!ctx.factoryId) {
            throw new Error(
              `TENANT_ACCESS_DENIED: ${model} query requires factoryId context. ` +
              `Ensure setTenantContext() was called in middleware.`
            );
          }
          args.where = { ...args.where, factoryId: ctx.factoryId };
        }
        return query(args);
      },
    },
  },
});

export const prisma = extendedPrisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;