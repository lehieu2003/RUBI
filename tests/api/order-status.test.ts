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
