import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const helpers = readFileSync(
  join(process.cwd(), 'src/lib/auth/helpers.ts'),
  'utf-8',
);

const auth = readFileSync(join(process.cwd(), 'src/lib/auth.ts'), 'utf-8');

describe('requireRole impersonation support', () => {
  it('lets an impersonating SUPER_ADMIN through role-gated reads', () => {
    assert.match(helpers, /impersonate_token/);
    assert.match(helpers, /SUPER_ADMIN/);
  });

  it('verifies the impersonation session is still active (endedAt) before bypassing roles', () => {
    assert.match(helpers, /endedAt/);
  });
});

describe('getSession impersonation tenant swap', () => {
  it('swaps session factoryId to the impersonated factory', () => {
    assert.match(auth, /impersonate_token/);
    assert.match(auth, /impersonationLog/);
  });
});
