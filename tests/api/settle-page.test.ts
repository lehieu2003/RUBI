import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const settle = readFileSync(
  join(process.cwd(), 'src/app/settle/page.tsx'),
  'utf-8',
);

const ordersApi = readFileSync(
  join(process.cwd(), 'src/app/api/orders/route.ts'),
  'utf-8',
);

describe('settle page source checks', () => {
  it('reads the orders out of the response envelope on every fetch', () => {
    assert.match(settle, /json\.data as OrderFromAPI\[\]/);
    assert.match(settle, /\?\$\{filter\}&page=\$\{page\}&limit=\$\{MAX_PAGE_SIZE\}/);
  });

  it('fetches all of today orders without status filter for the stat cards', () => {
    assert.match(settle, /fetchAllOrders\(`date=\$\{date\}`\)/);
    assert.equal(settle.match(/fetchOrdersOfDay\(todayStr\)/g)?.length, 2);
  });

  it('lists every DELIVERED order whatever day it was taken, on load and after each settlement', () => {
    assert.match(settle, /fetchAllOrders\('status=DELIVERED'\)/);
    assert.equal(settle.match(/fetchOrdersAwaitingSettlement\(\),/g)?.length, 2);
    // success is reported before the refresh, so a failed refresh is not a failed settlement
    assert.ok(settle.indexOf("title: 'Đã chốt đơn thành công'") < settle.lastIndexOf('fetchOrdersAwaitingSettlement(),'));
    assert.match(settle, /const mappedOrders = awaiting\.map/);
    assert.match(settle, /const pendingCount = awaiting\.length/);
  });

  it('counts the orders settled today by their settlement day, not by the day they were taken', () => {
    assert.match(settle, /\?status=COMPLETED&completedDate=\$\{date\}&page=1&limit=1/);
    assert.equal(settle.match(/fetchSettledCount\(todayStr\),/g)?.length, 2);
    assert.doesNotMatch(settle, /orders\.filter\(\(o\) => o\.status === 'COMPLETED'\)/);
    const reconcile = readFileSync(join(process.cwd(), 'src/app/api/orders/[id]/reconcile/route.ts'), 'utf-8');
    assert.match(reconcile, /data: \{ status: 'COMPLETED', completedAt: new Date\(\) \}/);
    const filters = readFileSync(join(process.cwd(), 'src/lib/order-filters.ts'), 'utf-8');
    assert.match(filters, /where\.completedAt = \{ gte: day\.start, lt: day\.end \}/);
  });

  it('never falls back to raw driverId for display', () => {
    assert.doesNotMatch(settle, /order\.driver\?\.name\s*\|\|\s*order\.driverId/);
  });
});

describe('orders list API source checks', () => {
  it('includes driver id and name for settlement display', () => {
    assert.match(ordersApi, /driver:\s*\{\s*select:\s*\{\s*id:\s*true,\s*name:\s*true\s*\}\s*\}/);
  });
});
