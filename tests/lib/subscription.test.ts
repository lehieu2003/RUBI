import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync('src/app/api/schedule/assignments/route.ts', 'utf8');

describe('schedule subscription limit source checks', () => {
  it('keeps subscription max driver formula and schedule-specific count', () => {
    assert.match(source, /const maxDrivers = 1 \+ \(subscription\?\.driverCount \?\? 0\)/);
    assert.match(source, /scheduleAssignment\.findMany/);
    assert.match(source, /person\.role === 'DRIVER'/);
  });
});

import { isSubscriptionActive, isWithinWarningPeriod } from '../../src/lib/subscription-status';

describe('isSubscriptionActive behavior', () => {
  const base = { planType: 'PAID' as const, status: 'ACTIVE' as const, endDate: new Date('2026-12-31') };

  it('active PAID within endDate allows writes', () => {
    assert.equal(isSubscriptionActive({ ...base }), true);
  });

  it('PAID past endDate is inactive (expiry without a status flip)', () => {
    assert.equal(isSubscriptionActive({ ...base, endDate: new Date('2026-01-01') }), false);
  });

  it('ACTIVE TRIAL within endDate allows writes', () => {
    assert.equal(isSubscriptionActive({ ...base, planType: 'TRIAL' as const }), true);
  });

  it('CANCELLED or EXPIRED are inactive regardless of dates', () => {
    assert.equal(isSubscriptionActive({ ...base, status: 'CANCELLED' as const }), false);
    assert.equal(isSubscriptionActive({ ...base, status: 'EXPIRED' as const }), false);
  });
});
