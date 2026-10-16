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
    assert.match(maintenanceRoute, /\.datetime\(\)\s*\.or\(z\.string\(\)\.refine\(\(value\) => vietnamDayRange\(value\) !== null\)\)/);
    assert.match(maintenanceRoute, /performedAt: DateString/);
  });

  it('all routes use the response envelope', () => {
    for (const [name, source] of [['list', listRoute], ['detail', detailRoute], ['maintenance', maintenanceRoute]]) {
      assert.match(source, /apiSuccess/, `${name} missing apiSuccess`);
    }
  });
});

describe('next maintenance due date', () => {
  const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

  it('a newer record of the same type replaces the older due date', async () => {
    const { currentDueDates } = await import('../../src/lib/maintenance');
    const due = currentDueDates([
      { type: 'ROUTINE', performedAt: day('2025-10-01'), dueAt: day('2026-10-01') },
      { type: 'ROUTINE', performedAt: day('2026-09-25'), dueAt: day('2027-10-01') },
    ]);
    assert.deepEqual(due.map((record) => record.dueAt), [day('2027-10-01')]);
  });

  it('takes the soonest across types, each from its latest record', async () => {
    const { currentDueDates } = await import('../../src/lib/maintenance');
    const due = currentDueDates([
      { type: 'INSURANCE', performedAt: day('2026-01-10'), dueAt: day('2027-01-10') },
      { type: 'ROUTINE', performedAt: day('2026-09-25'), dueAt: day('2027-10-01') },
      { type: 'ROUTINE', performedAt: day('2025-10-01'), dueAt: day('2026-10-01') },
      { type: 'INSPECTION', performedAt: day('2026-06-01'), dueAt: day('2026-12-01') },
    ]);
    assert.deepEqual(
      due.map((record) => [record.type, record.dueAt]),
      [['INSPECTION', day('2026-12-01')], ['INSURANCE', day('2027-01-10')], ['ROUTINE', day('2027-10-01')]]
    );
  });

  it('a latest record without a due date leaves nothing due for that type', async () => {
    const { currentDueDates } = await import('../../src/lib/maintenance');
    const due = currentDueDates([
      { type: 'REPAIR', performedAt: day('2026-01-01'), dueAt: day('2026-10-20') },
      { type: 'REPAIR', performedAt: day('2026-09-01'), dueAt: null },
    ]);
    assert.deepEqual(due, []);
  });

  it('the asset list and the dashboard alert both use it', () => {
    const list = read('src/app/api/assets/route.ts');
    const dashboard = read('src/app/dashboard/page.tsx');
    assert.match(list, /currentDueDates\(maintenanceRecords\)/);
    assert.doesNotMatch(list, /orderBy: \{ dueAt: 'asc' \}/);
    assert.match(dashboard, /currentDueDates\(/);
    assert.doesNotMatch(dashboard, /orderBy: \{ dueAt: 'asc' \},\s*take: 5/);
  });
});
