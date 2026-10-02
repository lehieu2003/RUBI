import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const auth = readFileSync(join(process.cwd(), 'src/lib/auth.ts'), 'utf8');
const nextConfig = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf8');

describe('session validity checks', () => {
  it('getSession verifies the user is still active in DB before trusting the JWT', () => {
    assert.match(auth, /prismaAuth\.user\.findUnique/);
    assert.match(auth, /isActive/);
    // Deactivated user must yield a null session, not the stale JWT payload
    assert.match(auth, /isActive[^}]*\?[^}]*null|return null[\s\S]*?isActive|isActive[\s\S]{0,200}return null/);
  });
});

describe('security headers', () => {
  it('blocks iframe embedding (clickjacking)', () => {
    assert.match(nextConfig, /X-Frame-Options/);
    assert.match(nextConfig, /DENY/);
  });

  it('prevents MIME sniffing and leaks referrer', () => {
    assert.match(nextConfig, /X-Content-Type-Options/);
    assert.match(nextConfig, /nosniff/);
    assert.match(nextConfig, /Referrer-Policy/);
  });

  it('scopes browser capabilities to same origin (camera/geolocation for driver)', () => {
    assert.match(nextConfig, /Permissions-Policy/);
  });

  it('enables HSTS for production HTTPS', () => {
    assert.match(nextConfig, /Strict-Transport-Security/);
  });
});
