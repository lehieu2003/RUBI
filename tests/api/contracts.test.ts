import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { apiContracts, ErrorResponse, findContract } from '../../src/lib/contracts';
import { renderAll } from '../../scripts/generate-api-docs';

/** Every exported HTTP handler under src/app/api as "METHOD /api/path/{param}". */
function routeHandlers(): string[] {
  const files = execSync("git ls-files 'src/app/api/**/route.ts'", { encoding: 'utf8' }).trim().split('\n');
  return files.flatMap((file) => {
    const path = file
      .replace(/^src\/app/, '')
      .replace(/\/route\.ts$/, '')
      .replace(/\[([^\]]+)\]/g, '{$1}');
    const methods = readFileSync(file, 'utf8').matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)\b/g);
    return [...methods].map((match) => `${match[1]} ${path}`);
  });
}

describe('API contracts', () => {
  const declared = apiContracts.map((contract) => `${contract.method} ${contract.path}`);

  it('every route handler has a contract', () => {
    const missing = routeHandlers().filter((handler) => !declared.includes(handler));
    assert.deepEqual(missing, [], 'add a contract in src/lib/contracts for: ' + missing.join(', '));
  });

  it('every contract points at an existing route handler', () => {
    const handlers = routeHandlers();
    const orphans = declared.filter((entry) => !handlers.includes(entry));
    assert.deepEqual(orphans, [], 'remove or fix the contract for: ' + orphans.join(', '));
  });

  it('contract ids and method+path pairs are unique', () => {
    const ids = apiContracts.map((contract) => contract.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate contract id');
    assert.equal(new Set(declared).size, declared.length, 'duplicate method + path');
  });

  it('path parameters are declared exactly', () => {
    for (const contract of apiContracts) {
      const inPath = [...contract.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
      const inSchema = Object.keys(contract.params?.shape ?? {}).sort();
      assert.deepEqual(inSchema, inPath, `${contract.id}: params must match the path placeholders`);
    }
  });

  it('role-restricted endpoints list 401 and 403; session endpoints list 401', () => {
    for (const contract of apiContracts) {
      if (contract.auth.kind === 'roles') {
        assert.ok(contract.errors.includes(401) && contract.errors.includes(403), `${contract.id} must list 401 and 403`);
      }
      if (contract.auth.kind === 'session') {
        assert.ok(contract.errors.includes(401), `${contract.id} must list 401`);
      }
    }
  });

  it('accepts both error shapes the app produces', () => {
    assert.ok(ErrorResponse.safeParse({ success: false, error: 'Không tìm thấy đơn hàng' }).success);
    assert.ok(ErrorResponse.safeParse({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn', code: 'X' }).success);
    assert.equal(ErrorResponse.safeParse({ success: true, data: {} }).success, false);
  });

  it('request schemas accept valid input and reject invalid input', () => {
    const login = findContract('POST', '/api/auth/login')!;
    assert.ok(login.body!.safeParse({ email: 'a@rubi.vn', password: 'x' }).success);
    assert.equal(login.body!.safeParse({ email: 'not-an-email', password: 'x' }).success, false);

    const request = findContract('POST', '/api/schedule/my')!;
    assert.ok(request.body!.safeParse({ shiftDate: '2026-10-11', shift: 'SLOT_06_09' }).success);
    assert.equal(request.body!.safeParse({ shiftDate: '11/10/2026', shift: 'SLOT_06_09' }).success, false);
    assert.equal(request.body!.safeParse({ shiftDate: '2026-10-11', shift: 'MORNING' }).success, false);
  });

  it('the generated docs are up to date (run `npm run contract:docs`)', () => {
    for (const [path, content] of Object.entries(renderAll())) {
      assert.equal(readFileSync(path, 'utf8'), content, `${path} is stale: run npm run contract:docs`);
    }
  });
});
