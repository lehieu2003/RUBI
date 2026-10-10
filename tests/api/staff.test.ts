import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const staffRoute = readFileSync('src/app/api/staff/route.ts', 'utf8');
const staffIdRoute = readFileSync('src/app/api/staff/[id]/route.ts', 'utf8');

describe('staff driver account source checks', () => {
  it('allows DRIVER as a staff-managed account role', () => {
    assert.match(staffRoute, /'DRIVER'/);
    assert.match(staffIdRoute, /'DRIVER'/);
  });

  it('creates or links driver profiles from DRIVER accounts', () => {
    assert.match(staffRoute, /role === 'DRIVER'/);
    assert.match(staffRoute, /tx\.driver\.create/);
    assert.match(staffIdRoute, /updatedUser\.role === 'DRIVER'/);
    assert.match(staffIdRoute, /userId: updatedUser\.id/);
  });
});

describe('staff password policy', () => {
  const createRoute = readFileSync('src/app/api/staff/route.ts', 'utf8');
  const updateRoute = readFileSync('src/app/api/staff/[id]/route.ts', 'utf8');
  const settingsPage = readFileSync('src/app/settings/page.tsx', 'utf8');

  it('enforces the shared password policy everywhere (create, reset, UI)', () => {
    for (const [name, source] of [['create', createRoute], ['update', updateRoute]]) {
      assert.doesNotMatch(source, /length < 6/, `${name} route still allows 6-char passwords`);
      assert.match(source, /validatePassword\(/, `${name} route must apply the shared password policy`);
    }
    assert.match(settingsPage, /length < 8/);
    assert.doesNotMatch(settingsPage, /length < 6/);
    assert.doesNotMatch(settingsPage, /ít nhất 6 ký tự/);
  });
});

describe('driver share link is gone', () => {
  it('drivers have no link token: the page, both APIs and the columns are removed', () => {
    for (const path of ['src/app/d', 'src/app/api/d', 'src/app/api/staff/[id]/rotate-link']) {
      assert.equal(existsSync(path), false, `${path} must not exist`);
    }
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    const driverModel = schema.slice(schema.indexOf('model Driver {'), schema.indexOf('}', schema.indexOf('model Driver {')));
    assert.doesNotMatch(driverModel, /\btoken\b|\bslug\b/);
    assert.doesNotMatch(readFileSync('src/app/settings/page.tsx', 'utf8'), /rotate-link|link giao hàng/);
  });

  it('the driver order list and delivery confirmation accept a session only', () => {
    for (const path of ['src/app/api/driver/orders/route.ts', 'src/app/api/orders/[id]/confirm/route.ts']) {
      const source = readFileSync(path, 'utf8');
      assert.match(source, /requireRole\(\['DRIVER'\]\)/, path);
      assert.doesNotMatch(source, /searchParams\.get\('token'\)|where:\s*\{\s*token/, path);
    }
  });
});
