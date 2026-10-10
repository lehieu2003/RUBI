import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const confirmRoute = readFileSync(
  join(process.cwd(), 'src/app/api/orders/[id]/confirm/route.ts'),
  'utf-8',
);

const driverPage = readFileSync(
  join(process.cwd(), 'src/app/driver/page.tsx'),
  'utf-8',
);

describe('driver confirm source checks', () => {
  it('records deliveredAt when confirming delivery', () => {
    assert.match(confirmRoute, /deliveredAt:\s*new Date\(\)/);
  });

  it('only confirms an order that is out for delivery', () => {
    assert.match(confirmRoute, /order\.status !== 'SHIPPING'/);
    assert.match(confirmRoute, /409, 'ORDER_NOT_SHIPPING'/);
    // the write repeats the status check, so a settled order cannot be reopened
    assert.match(confirmRoute, /where: \{ id, factoryId: driver\.factoryId, driverId: driver\.id, status: 'SHIPPING' \}/);
    assert.doesNotMatch(confirmRoute, /prisma\.order\.update\(/);
  });

  it('keeps open orders of earlier days on the driver list', () => {
    const list = readFileSync(join(process.cwd(), 'src/app/api/driver/orders/route.ts'), 'utf-8');
    assert.match(list, /\{ status: 'SHIPPING', createdAt: \{ lt: day\.end \} \}/);
    assert.match(list, /\{ status: 'DELIVERED', deliveredAt: \{ gte: day\.start, lt: day\.end \} \}/);
  });

  it('confirms delivery without capturing GPS', () => {
    assert.doesNotMatch(confirmRoute, /gps/i);
    assert.doesNotMatch(driverPage, /getCurrentPosition|gps/i);
  });
});
