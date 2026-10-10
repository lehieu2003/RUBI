export interface TenantContext {
  factoryId: string | null;
  role: 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'DRIVER' | null;
}

const emptyTenantContext: TenantContext = { factoryId: null, role: null };

// Kept for compatibility with existing callers. Tenant scoping must be explicit
// in Prisma where clauses; Next middleware/client bundles cannot use async_hooks.
export function setTenantContext(factoryId: string | null, role: TenantContext['role']): void {
  void factoryId;
  void role;
}

// Prisma $extends guard calls this as a fallback only. Returning an empty context
// forces tenant-owned queries to pass an explicit factoryId filter.
export function getTenantContext(): TenantContext {
  return emptyTenantContext;
}
