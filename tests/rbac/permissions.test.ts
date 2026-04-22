import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canAccessPath, getVisibleTenantRoutes, type TenantRole } from '../../src/lib/rbac/permissions';

const tenantRoutes = [
  '/dashboard',
  '/orders',
  '/orders/123',
  '/customers',
  '/customers/123',
  '/settle',
  '/inventory',
  '/vehicles',
  '/reports/debt',
  '/deposits/shells',
  '/dashboard/map',
  '/settings',
  '/settings/billing',
  '/billing',
  '/config/prices',
];

function assertAllowed(role: TenantRole, paths: string[]) {
  for (const path of paths) {
    assert.equal(canAccessPath(role, path), true, `${role} should access ${path}`);
  }
}

function assertDenied(role: TenantRole | 'SUPER_ADMIN', paths: string[]) {
  for (const path of paths) {
    assert.equal(canAccessPath(role, path), false, `${role} should not access ${path}`);
  }
}

describe('RBAC route permissions', () => {
  it('allows STAFF only order-entry routes', () => {
    assertAllowed('STAFF', ['/dashboard', '/orders', '/orders/123', '/customers', '/customers/123']);
    assertDenied('STAFF', ['/settle', '/inventory', '/vehicles', '/settings', '/reports/debt', '/deposits/shells']);
  });

  it('allows ACCOUNTANT operational routes but denies admin routes', () => {
    assertAllowed('ACCOUNTANT', [
      '/dashboard',
      '/orders',
      '/customers',
      '/settle',
      '/inventory',
      '/vehicles',
      '/reports/debt',
      '/deposits/shells',
      '/dashboard/map',
    ]);
    assertDenied('ACCOUNTANT', ['/settings', '/settings/billing', '/billing', '/config/prices']);
  });

  it('allows ADMIN every tenant route in the matrix', () => {
    assertAllowed('ADMIN', tenantRoutes);
  });

  it('denies SUPER_ADMIN direct tenant app route access', () => {
    assertDenied('SUPER_ADMIN', tenantRoutes);
  });

  it('filters visible tenant routes by the same permission source', () => {
    const staffRoutes = getVisibleTenantRoutes('STAFF').map((route) => route.href);
    assert.deepEqual(staffRoutes, ['/dashboard', '/orders', '/customers']);

    const accountantRoutes = getVisibleTenantRoutes('ACCOUNTANT').map((route) => route.href);
    assert.equal(accountantRoutes.includes('/settings'), false);
    assert.equal(accountantRoutes.includes('/settle'), true);
  });
});
