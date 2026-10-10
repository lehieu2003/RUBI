import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const authPath = join(process.cwd(), 'src/lib/auth.ts');
const middlewarePath = join(process.cwd(), 'src/middleware.ts');

describe('bearer session source checks', () => {
  it('auth lib and middleware files exist', () => {
    assert.ok(existsSync(authPath), 'src/lib/auth.ts must exist');
    assert.ok(existsSync(middlewarePath), 'src/middleware.ts must exist');
  });

  it('getSession reads the Authorization header via headers()', () => {
    const auth = readFileSync(authPath, 'utf-8');
    assert.match(auth, /import\s*\{[^}]*\bheaders\b[^}]*\}\s*from\s*'next\/headers'/);
    assert.match(auth, /await\s+headers\(\)/);
    assert.match(auth, /\.get\('authorization'\)/);
  });

  it('getSession parses a case-insensitive Bearer prefix', () => {
    const auth = readFileSync(authPath, 'utf-8');
    assert.match(auth, /\/\^bearer \/i/);
  });

  it('getSession still falls back to the auth_token cookie', () => {
    const auth = readFileSync(authPath, 'utf-8');
    assert.match(auth, /cookieStore\.get\('auth_token'\)/);
  });

  it('middleware reads authorization header before cookie fallback', () => {
    const middleware = readFileSync(middlewarePath, 'utf-8');
    const headerIdx = middleware.indexOf("request.headers.get('authorization')");
    const cookieIdx = middleware.indexOf("request.cookies.get('auth_token')");
    assert.ok(headerIdx !== -1, 'middleware must read the authorization header');
    assert.ok(cookieIdx !== -1, 'middleware must keep the auth_token cookie fallback');
    assert.ok(
      headerIdx < cookieIdx,
      'authorization header must be parsed before the cookie fallback'
    );
  });

  it('middleware strips the Bearer prefix for token verification', () => {
    const middleware = readFileSync(middlewarePath, 'utf-8');
    assert.match(middleware, /startsWith\('bearer '\)|startsWith\('Bearer '\)/);
    assert.match(middleware, /slice\(7\)/);
  });
});
