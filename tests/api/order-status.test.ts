import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const route = readFileSync(
  join(process.cwd(), 'src/app/api/orders/[id]/status/route.ts'),
  'utf-8',
);

describe('order status API source checks', () => {
  it('accepts forward statuses without COMPLETED', () => {
    const schemaMatch = route.match(/z\.enum\(\[([^\]]+)\]\)/);
    assert.ok(schemaMatch, 'StatusSchema z.enum not found');
    const statuses = schemaMatch[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
    assert.ok(statuses.includes('PENDING'), 'PENDING must be allowed');
    assert.ok(statuses.includes('SHIPPING'), 'SHIPPING must be allowed');
    assert.ok(statuses.includes('DELIVERED'), 'DELIVERED must be allowed');
    assert.ok(statuses.includes('CANCELLED'), 'CANCELLED must be allowed');
    assert.ok(!statuses.includes('COMPLETED'), 'COMPLETED must NOT be settable via status API');
  });

  it('rejects COMPLETED explicitly with settlement guidance', () => {
    assert.match(route, /COMPLETED/);
    assert.match(route, /Đối soát/);
  });
});

describe('order status: settled and cancelled orders are final', () => {
  const route = readFileSync(join(process.cwd(), 'src/app/api/orders/[id]/status/route.ts'), 'utf-8');

  it('refuses to change a COMPLETED or CANCELLED order', () => {
    assert.match(route, /existing\.status === 'COMPLETED' \|\| existing\.status === 'CANCELLED'/);
    assert.match(route, /409,\s*'ORDER_FINAL'/);
  });

  it('checks the current status before writing', () => {
    assert.ok(route.indexOf("'ORDER_FINAL'") < route.indexOf('tx.order.updateMany('), 'the guard must run before the update');
  });

  it('checks the status again in the write and refuses a stale screen', () => {
    assert.match(route, /where: \{ id, factoryId: existing\.factoryId, status: existing\.status \}/);
    assert.match(route, /expectedStatus: z\.enum\(\['PENDING', 'SHIPPING', 'DELIVERED'\]\)\.optional\(\)/);
    assert.match(route, /409, 'ORDER_STATUS_CHANGED'/);
    assert.doesNotMatch(route, /prisma\.order\.update\(/);
  });
});


describe('order status: cancelling keeps the order note', () => {
  it('appends the reason on its own line after the note', async () => {
    const { withCancelReason } = await import('../../src/lib/order-notes');
    assert.equal(withCancelReason('Giao cổng sau', 'Khách gọi hủy'), 'Giao cổng sau\n[HỦY: Khách gọi hủy]');
  });

  it('is just the tag when the order had no note', async () => {
    const { withCancelReason } = await import('../../src/lib/order-notes');
    assert.equal(withCancelReason(null, 'Khách gọi hủy'), '[HỦY: Khách gọi hủy]');
    assert.equal(withCancelReason('  ', 'Khách gọi hủy'), '[HỦY: Khách gọi hủy]');
  });

  it('the status route writes the note through it', () => {
    assert.match(route, /withCancelReason\(existing\.notes, parsed\.data\.cancellationReason\)/);
  });
});
