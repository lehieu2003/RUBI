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
    assert.equal(settle.match(/setOrders\(await fetchOrdersOfDay\(todayStr\)\)/g)?.length, 2);
  });

  it('fetches all of today orders without status filter (counters derive client-side)', () => {
    assert.doesNotMatch(settle, /ORDERS\.BASE\?status=DELIVERED/);
    assert.match(settle, /\?date=\$\{date\}&page=\$\{page\}&limit=\$\{MAX_PAGE_SIZE\}/);
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
