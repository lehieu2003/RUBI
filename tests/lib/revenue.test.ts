import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { revenueOf } from '../../src/lib/revenue';

describe('revenueOf', () => {
  it('sums the orders but leaves the cancelled ones out', () => {
    const orders = [
      { total: 100_000, status: 'PENDING' },
      { total: '50000', status: 'DELIVERED' },
      { total: 999_000, status: 'CANCELLED' },
      { total: 20_000, status: 'COMPLETED' },
      { total: 30_000, status: 'SHIPPING' },
    ];
    assert.equal(revenueOf(orders), 200_000);
  });

  it('is zero with no orders or only cancelled ones', () => {
    assert.equal(revenueOf([]), 0);
    assert.equal(revenueOf([{ total: 5_000, status: 'CANCELLED' }]), 0);
  });
});
