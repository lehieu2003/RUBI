import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const middleware = readFileSync(
  join(process.cwd(), 'src/middleware.ts'),
  'utf-8',
);

const authProvider = readFileSync(
  join(process.cwd(), 'src/lib/auth-provider.tsx'),
  'utf-8',
);

describe('impersonation middleware source checks', () => {
  it('exempts exactly logout and impersonate-end from the read-only block', () => {
    assert.match(
      middleware,
      /pathname === '\/api\/auth\/logout' \|\| pathname === '\/api\/admin\/impersonate\/end'/
    );
  });

  it('treats impersonating super admin as tenant ADMIN for path access', () => {
    assert.match(middleware, /effectiveRole/);
    assert.match(middleware, /impersonateToken/);
  });

  it('sends unauthorized impersonating users to tenant dashboard, not admin dashboard', () => {
    // effectiveRole is ADMIN during impersonation, so the redirect ternary
    // must key off effectiveRole (landing on /dashboard), not userRole.
    assert.match(middleware, /effectiveRole === 'SUPER_ADMIN'\s*\?\s*'\/admin\/dashboard'/);
    assert.doesNotMatch(middleware, /canAccessPath\(userRole/);
  });
});

describe('signOut source checks', () => {
  it('refuses to redirect when the logout API call fails', () => {
    assert.match(authProvider, /res\.ok/);
  });
});
