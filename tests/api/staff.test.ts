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
