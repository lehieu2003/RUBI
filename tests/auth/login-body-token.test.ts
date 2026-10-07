import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const routePath = join(process.cwd(), 'src/app/api/auth/login/route.ts');

describe('login API returns JWT in response body', () => {
  it('route file exists', () => {
    assert.ok(existsSync(routePath), 'src/app/api/auth/login/route.ts must exist');
  });

  it('includes token in the apiSuccess response body', () => {
    const route = readFileSync(routePath, 'utf-8');
    assert.match(route, /apiSuccess\(\{[\s\S]*?user:\s*\{[\s\S]*?\},\s*token,/);
  });

  it('still sets the session cookie', () => {
    const route = readFileSync(routePath, 'utf-8');
    assert.match(route, /await\s+setSessionCookie\(token\)/);
  });

  it('still rate-limits login attempts', () => {
    const route = readFileSync(routePath, 'utf-8');
    assert.match(route, /rateLimit\(/);
  });
});
