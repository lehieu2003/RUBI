import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { validatePassword } from '../../src/lib/password';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('password policy', () => {
  it('accepts a password with letters and digits', () => {
    assert.equal(validatePassword('matkhau999x'), null);
    assert.equal(validatePassword('Đá-sạch 2026'), null);
  });

  it('rejects short, single-class and well-known passwords', () => {
    assert.match(validatePassword('a1b2c3') ?? '', /ít nhất 8/);
    assert.match(validatePassword('12345678') ?? '', /chữ và số/);
    assert.match(validatePassword('abcdefgh') ?? '', /chữ và số/);
    assert.match(validatePassword('Password123') ?? '', /dễ đoán/);
    assert.match(validatePassword(undefined) ?? '', /ít nhất 8/);
    assert.match(validatePassword('a1'.repeat(40)) ?? '', /tối đa/);
  });
});

describe('change-password endpoint source checks', () => {
  const route = read('src/app/api/auth/password/route.ts');

  it('is rate limited and requires a session', () => {
    assert.match(route, /await rateLimit\(`password:\$\{ip\}`, 5, 60 \* 1000\)/);
    assert.match(route, /apiError\('Chưa đăng nhập hoặc phiên đã hết hạn', 401\)/);
  });

  it('verifies the current password and applies the policy', () => {
    assert.match(route, /bcrypt\.compare\(currentPassword, user\.password\)/);
    assert.match(route, /validatePassword\(newPassword\)/);
  });

  it('clears the must-change flag and reissues the session', () => {
    assert.match(route, /mustChangePassword: false/);
    assert.match(route, /await setSessionCookie\(token\)/);
  });
});

describe('forced password change', () => {
  it('accounts created or reset by the manager must change their password', () => {
    assert.match(read('src/app/api/staff/route.ts'), /mustChangePassword: true/);
    assert.match(read('src/app/api/staff/[id]/route.ts'), /updateData\.mustChangePassword = true/);
  });

  it('is enforced in middleware and in requireSession', () => {
    const middleware = read('src/middleware.ts');
    assert.match(middleware, /session\?\.mustChangePassword/);
    assert.match(middleware, /PASSWORD_CHANGE_REQUIRED/);
    assert.match(middleware, /!pathname\.startsWith\('\/api\/auth\/'\)/);
    assert.match(read('src/lib/auth/helpers.ts'), /PASSWORD_CHANGE_REQUIRED/);
  });

  it('getSession reads the flag from the database, not only from the token', () => {
    assert.match(read('src/lib/auth.ts'), /session\.mustChangePassword = userState\.mustChangePassword/);
  });
});

describe('single manager', () => {
  it('the app can only create STAFF and DRIVER accounts', () => {
    for (const file of ['src/app/api/staff/route.ts', 'src/app/api/staff/[id]/route.ts']) {
      assert.match(read(file), /const STAFF_ROLES = \['STAFF', 'DRIVER'\] as const/);
    }
    assert.doesNotMatch(read('src/app/settings/page.tsx'), /<option value="ADMIN">/);
  });

  it('manager accounts cannot be edited or removed through the staff API', () => {
    const route = read('src/app/api/staff/[id]/route.ts');
    assert.match(route, /Không thể sửa tài khoản Quản lý/);
    assert.match(route, /Không thể xóa tài khoản Quản lý/);
  });

  it('create-admin refuses when a manager already exists and never hard-codes a password', () => {
    const script = read('scripts/create-admin.ts');
    assert.match(script, /where: \{ role: 'ADMIN' \}/);
    assert.match(script, /validatePassword\(password\)/);
    assert.doesNotMatch(script, /12345678/);
  });
});

describe('seed safety', () => {
  const seed = read('src/db/seed.ts');

  it('refuses non-local databases and never overwrites existing passwords', () => {
    assert.match(seed, /assertSafeToSeed\(\);/);
    assert.match(seed, /SEED_ALLOW_REMOTE/);
    assert.doesNotMatch(seed, /update: \{ password/);
  });
});
