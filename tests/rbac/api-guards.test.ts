import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const adminWriteRoutes = [
  'src/app/api/customers/route.ts',
  'src/app/api/drivers/route.ts',
  'src/app/api/staff/route.ts',
  'src/app/api/staff/[id]/route.ts',
  'src/app/api/prices/global/route.ts',
  'src/app/api/prices/customer/override/route.ts',
];

const operationalWriteRoutes = [
  'src/app/api/deposits/shells/route.ts',
  'src/app/api/orders/[id]/status/route.ts',
  'src/app/api/orders/[id]/reconcile/route.ts',
  'src/app/api/orders/bulk-assign/route.ts',
  'src/app/api/schedule/assignments/route.ts',
];

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('RBAC API guard source checks', () => {
  it('uses requireRole in ADMIN-only write route files', () => {
    for (const route of adminWriteRoutes) {
      assert.match(read(route), /requireRole\(\['ADMIN'\]\)/, `${route} should use ADMIN requireRole`);
    }
  });

  it('uses ADMIN-only requireRole in operational write route files', () => {
    for (const route of operationalWriteRoutes.filter((r) => !r.includes('orders/[id]/status'))) {
      assert.match(read(route), /requireRole\(\['ADMIN'\]\)/, `${route} should use ops requireRole`);
    }
  });

  it('lets STAFF update order status (matches /orders = all tenant roles)', () => {
    assert.match(read('src/app/api/orders/[id]/status/route.ts'), /requireRole\(\['ADMIN', 'STAFF'\]\)/);
  });

  it('removes manual session.role comparisons from migrated route files', () => {
    for (const route of [...adminWriteRoutes, ...operationalWriteRoutes]) {
      assert.doesNotMatch(read(route), /session\.role !==/, `${route} should not use manual role comparisons`);
    }
  });

  it('allows STAFF to read orders without changing factory scoping', () => {
    const source = read('src/app/api/orders/route.ts');
    assert.match(source, /requireRole\(\['ADMIN', 'STAFF'\]\)/);
    assert.match(source, /factoryId: session\.factoryId/);
  });

  it('has no super admin or impersonation path left in auth/middleware', () => {
    for (const file of ['src/middleware.ts', 'src/lib/auth.ts', 'src/lib/auth/helpers.ts']) {
      assert.doesNotMatch(read(file), /SUPER_ADMIN|impersonat/i, `${file} should be single-factory only`);
    }
  });

  it('redirects unauthorized navigation back to the role home', () => {
    const source = read('src/middleware.ts');
    assert.match(source, /userRole === 'DRIVER' \? '\/driver' : '\/dashboard'/);
  });

  it('keeps JWT production secret baseline hardened', () => {
    const source = read('src/lib/auth.ts');
    assert.doesNotMatch(source, /iceflow-secret-key-change-in-production/);
    assert.match(source, /JWT_SECRET environment variable is required in production/);
  });
});

describe('bulk-assign status gate', () => {
  const source = readFileSync('src/app/api/orders/bulk-assign/route.ts', 'utf8');

  it('assigns PENDING and SHIPPING orders (the office workflow)', () => {
    assert.match(source, /status:\s*\{\s*in:\s*\['PENDING',\s*'SHIPPING'\]\s*\}/);
  });

  it('never reassigns terminal orders (DELIVERED/COMPLETED/CANCELLED)', () => {
    assert.doesNotMatch(source, /status:\s*'SHIPPING'/);
    const filterMatch = source.match(/status:\s*\{\s*in:\s*\[([^\]]+)\]/);
    assert.ok(filterMatch, 'status filter required');
    const statuses = filterMatch[1].split(',').map(s => s.trim().replace(/'/g, ''));
    assert.deepEqual(statuses.sort(), ['PENDING', 'SHIPPING']);
  });
});

describe('guard rejections are served, not thrown', () => {
  it('no API route re-throws a Response (Next.js turns it into a 500)', () => {
    const hits = execSync(
      "grep -rn 'instanceof Response) throw error' src/app/api --include='*.ts' || true",
      { encoding: 'utf8' }
    ).trim();
    assert.equal(hits, '', 'use `return error` in route catch: ' + hits);
  });
});
