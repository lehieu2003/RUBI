import { PrismaClient } from '@prisma/client';
import { getTenantContext } from './tenant';

const factoryIdModels = ['Customer', 'Driver', 'Order', 'Product', 'User', 'Subscription'];

type TenantScopedArgs = {
  where?: {
    factoryId?: unknown;
    [key: string]: unknown;
  };
};

function scopeTenantQuery(model: string, args: TenantScopedArgs): TenantScopedArgs {
  const ctx = getTenantContext();
  if (ctx.role === 'SUPER_ADMIN') return args;
  if (!factoryIdModels.includes(model)) return args;

  if (ctx.factoryId) {
    args.where = { ...args.where, factoryId: ctx.factoryId };
    return args;
  }

  if (typeof args.where?.factoryId === 'string' && args.where.factoryId.length > 0) {
    return args;
  }

  throw new Error(
    `TENANT_ACCESS_DENIED: ${model} query requires factoryId context or an explicit factoryId filter. ` +
    `Pass session.factoryId in the query where clause.`
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Unextended Prisma instance — for auth endpoints that need global user lookups
// (no tenant $extends, shares the same connection pool as `prisma` before $extends wraps it)
// NOTE: basePrisma IS the original client; extendedPrisma wraps it with $extends.
// Both share the same underlying connection pool. This is intentional to avoid creating
// new connections that would exhaust the Pgbouncer pool_size limit.
const basePrisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Extended Prisma with automatic tenant filtering (applies to all $allModels queries)
const extendedPrisma = basePrisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        scopeTenantQuery(model, args);
        return query(args);
      },
      async findFirst({ model, args, query }) {
        scopeTenantQuery(model, args);
        return query(args);
      },
      async findUnique({ model, args, query }) {
        scopeTenantQuery(model, args);
        return query(args);
      },
      async count({ model, args, query }) {
        scopeTenantQuery(model, args);
        return query(args);
      },
    },
  },
});

export const prisma = extendedPrisma;

// Unextended Prisma client WITHOUT tenant filtering — for auth/internal lookups
// before tenant context is established. Reuses the same underlying connection
// pool as `prisma`; do not create another PrismaClient here.
export const prismaAuth = basePrisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;
