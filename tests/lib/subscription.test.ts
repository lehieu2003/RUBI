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
