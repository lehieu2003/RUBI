import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('assets API source checks', () => {
  const listRoute = read('src/app/api/assets/route.ts');
  const detailRoute = read('src/app/api/assets/[id]/route.ts');
  const maintenanceRoute = read('src/app/api/assets/[id]/maintenance/route.ts');

  it('list route: ops-only read, scoped create', () => {
    assert.match(listRoute, /export async function GET/);
    assert.match(listRoute, /requireRole\(\['ADMIN'\]\)/);
    assert.match(listRoute, /factoryId: session\.factoryId/);
  });

  it('create enforces per-factory code uniqueness with 409', () => {
    assert.match(listRoute, /code,\s*factoryId: session\.factoryId/);
    assert.match(listRoute, /409/);
  });

  it('detail route: scoped update, ADMIN-only delete', () => {
    assert.match(detailRoute, /requireRole\(\['ADMIN'\]\)/);
    assert.match(detailRoute, /requireRole\(\['ADMIN'\]\)/);
    assert.match(detailRoute, /factoryId: session\.factoryId/);
  });

  it('maintenance route: scoped history + create', () => {
    assert.match(maintenanceRoute, /requireRole\(\['ADMIN'\]\)/);
    assert.match(maintenanceRoute, /factoryId: session\.factoryId/);
    assert.match(maintenanceRoute, /performedAt/);
  });

  it('maintenance route: an unreadable date is a 400, not a server error', () => {
    assert.match(maintenanceRoute, /refine\(\(value\) => !Number\.isNaN\(new Date\(value\)\.getTime\(\)\)\)/);
    assert.match(maintenanceRoute, /performedAt: DateString/);
  });

  it('all routes use the response envelope', () => {
    for (const [name, source] of [['list', listRoute], ['detail', detailRoute], ['maintenance', maintenanceRoute]]) {
      assert.match(source, /apiSuccess/, `${name} missing apiSuccess`);
    }
  });
});
