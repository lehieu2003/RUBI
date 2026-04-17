import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  factoryId: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | null;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

// Set tenant context for current async operation (called per request in middleware)
export function setTenantContext(factoryId: string | null, role: TenantContext['role']): void {
  tenantStorage.enterWith({ factoryId, role });
}

// Get current tenant context (called in Prisma $extends hooks)
export function getTenantContext(): TenantContext {
  return tenantStorage.getStore() ?? { factoryId: null, role: null };
}
