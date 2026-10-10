import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canAccessPath, getAllowedRolesForPath, getVisibleTenantRoutes, type TenantRole } from '../../src/lib/rbac/permissions';

const tenantRoutes = [
  '/dashboard',
  '/orders',
  '/orders/123',
  '/customers',
  '/customers/123',
  '/driver',
  '/settle',
  '/inventory',
  '/vehicles',
  '/schedule',
  '/reports/debt',
  '/deposits/shells',
  '/settings',
  '/config/prices',
];

function assertAllowed(role: TenantRole, paths: string[]) {
  for (const path of paths) {
    assert.equal(canAccessPath(role, path), true, `${role} should access ${path}`);
  }
}

function assertDenied(role: TenantRole, paths: string[]) {
  for (const path of paths) {
    assert.equal(canAccessPath(role, path), false, `${role} should not access ${path}`);
  }
}

describe('RBAC route permissions', () => {
  it('allows STAFF only order-entry routes', () => {
    assertAllowed('STAFF', ['/dashboard', '/orders', '/orders/123', '/customers', '/customers/123']);
    assertDenied('STAFF', ['/settle', '/inventory', '/vehicles', '/schedule', '/settings', '/reports/debt', '/deposits/shells']);
  });

  it('allows DRIVER only driver route', () => {
    assertAllowed('DRIVER', ['/driver']);
    assertDenied('DRIVER', tenantRoutes.filter((path) => path !== '/driver'));
  });

  it('has no ACCOUNTANT role: operational routes are ADMIN-only', () => {
    assert.equal(canAccessPath('ACCOUNTANT' as TenantRole, '/dashboard'), false);
    for (const path of ['/settle', '/inventory', '/vehicles', '/assets', '/schedule', '/reports/debt', '/deposits/shells', '/settings', '/config/prices']) {
      assert.deepEqual(getAllowedRolesForPath(path), ['ADMIN'], `${path} should be ADMIN-only`);
    }
  });

  it('allows ADMIN every tenant route in the matrix', () => {
    assertAllowed('ADMIN', tenantRoutes.filter((path) => path !== '/driver'));
    assertDenied('ADMIN', ['/driver']);
  });

  it('filters visible tenant routes by the same permission source', () => {
    const staffRoutes = getVisibleTenantRoutes('STAFF').map((route) => route.href);
    assert.deepEqual(staffRoutes, ['/dashboard', '/orders', '/customers']);

    const driverRoutes = getVisibleTenantRoutes('DRIVER').map((route) => route.href);
    assert.deepEqual(driverRoutes, ['/driver']);
  });
});
