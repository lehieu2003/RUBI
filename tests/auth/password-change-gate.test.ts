import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

// requireSession / requireRole refuse an account that must still change its
// handed-out password; reading the session directly skips that check.
describe('forced password change gate', () => {
  it('only the auth routes read the session without the helpers', () => {
    const files = execSync("git ls-files 'src/app/api/**/route.ts' 'src/lib/actions/*.ts'", { encoding: 'utf8' })
      .trim()
      .split('\n');
    const allowed = ['src/app/api/auth/me/route.ts', 'src/app/api/auth/password/route.ts', 'src/app/api/auth/refresh/route.ts'];
    const direct = files.filter((file) => !allowed.includes(file) && /^(?!\s*\/\/).*\bgetSession\(\)/m.test(read(file)));
    assert.deepEqual(direct, [], 'use requireSession/requireRole from @/lib/auth/helpers in: ' + direct.join(', '));
  });

  it('keeps the roles each of them allowed before', () => {
    assert.match(read('src/app/api/reports/debt/route.ts'), /requireRole\(\['ADMIN'\]\)/);
    assert.match(read('src/lib/actions/orders.ts'), /requireRole\(\['ADMIN', 'STAFF'\]\)/);
    const products = read('src/app/api/products/route.ts');
    const get = products.slice(products.indexOf('export async function GET'), products.indexOf('export async function POST'));
    assert.match(get, /requireSession\(\)/);
    assert.match(get, /if \(error instanceof Response\) return error;/);
  });

  it('order entry actions keep returning a plain error, not a Response', () => {
    const action = read('src/lib/actions/orders.ts');
    assert.match(action, /if \(error instanceof Response\)/);
    assert.match(action, /throw new Error\(/);
  });
});
