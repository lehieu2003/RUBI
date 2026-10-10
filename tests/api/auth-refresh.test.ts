import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const routePath = join(process.cwd(), 'src/app/api/auth/refresh/route.ts');

describe('auth refresh API source checks', () => {
  it('route file exists', () => {
    assert.ok(existsSync(routePath), 'src/app/api/auth/refresh/route.ts must exist');
  });

  it('exports a POST handler that authenticates via getSession', () => {
    const route = readFileSync(routePath, 'utf-8');
    assert.match(route, /export async function POST/);
    assert.match(route, /getSession\(\)/);
  });

  it('rate limits refresh attempts per IP', () => {
    const route = readFileSync(routePath, 'utf-8');
    assert.match(route, /rateLimit/);
  });

  it('returns a fresh token in the success envelope', () => {
    const route = readFileSync(routePath, 'utf-8');
    assert.match(route, /apiSuccess\(\{\s*token/);
  });

  it('returns 401 Unauthorized without a valid session', () => {
    const route = readFileSync(routePath, 'utf-8');
    assert.match(route, /apiError\('Chưa đăng nhập hoặc phiên đã hết hạn',\s*401\)/);
  });
});
