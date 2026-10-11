import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
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

describe('role changes reach an open session', () => {
  it('getSession takes the role from the database, not from the token', () => {
    assert.match(auth, /select: \{ isActive: true, mustChangePassword: true, role: true \}/);
    assert.match(auth, /session\.role = userState\.role/);
  });

  it('/api/auth/me replaces a cookie that carries the old role', () => {
    const me = readFileSync(join(process.cwd(), 'src/app/api/auth/me/route.ts'), 'utf8');
    assert.match(me, /cookieClaims\.role !== user\.role/);
    assert.match(me, /\|\| roleChanged\) \{[\s\S]*?setSessionCookie/);
  });

  it('the settings dialog offers staff and driver only', () => {
    const settings = readFileSync(join(process.cwd(), 'src/app/settings/page.tsx'), 'utf8');
    const select = settings.slice(settings.indexOf('id="edit-staff-role"'));
    assert.deepEqual(select.slice(0, select.indexOf('</select>')).match(/value="[A-Z]+"/g), ['value="STAFF"', 'value="DRIVER"']);
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

describe('rate limiter backends', () => {
  const limiter = readFileSync(join(process.cwd(), 'src/lib/rate-limit.ts'), 'utf8');

  it('uses shared Redis when REDIS_URL is set (multi-instance safe)', () => {
    assert.match(limiter, /REDIS_URL/);
    assert.match(limiter, /ioredis/);
    assert.match(limiter, /ratelimit:/);
  });

  it('degrades to in-memory limiter when Redis is unavailable', () => {
    assert.match(limiter, /in-memory limiter/);
    assert.match(limiter, /memoryLimit/);
  });

  it('all rateLimit call sites await the async limiter', () => {
    const hits = execSync(
      "grep -rn '= rateLimit(' src/app --include='*.ts' | grep -v await || true",
      { encoding: 'utf8' }
    ).trim();
    assert.equal(hits, '', 'rateLimit must be awaited: ' + hits);
  });
});
