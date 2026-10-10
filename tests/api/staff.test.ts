import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

describe('driver share-link rotation', () => {
  const route = readFileSync('src/app/api/staff/[id]/rotate-link/route.ts', 'utf8');
  const settingsPage = readFileSync('src/app/settings/page.tsx', 'utf8');

  it('has an ADMIN-only rotation endpoint that regenerates the driver token', () => {
    assert.match(route, /requireRole\(\['ADMIN'\]\)/);
    assert.match(route, /randomUUID/);
    assert.match(route, /driver\.update/);
    assert.match(route, /driverProfile/);
  });

  it('exposes a rotate action in the staff UI for DRIVER rows', () => {
    assert.match(settingsPage, /rotate-link/);
  });
});
