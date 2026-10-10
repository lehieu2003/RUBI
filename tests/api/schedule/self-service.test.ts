import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { SHIFT_HOURS, addDays, parseDateOnly, toDateOnly, todayInVietnam } from '../../../src/lib/schedule';

const read = (path: string) => readFileSync(path, 'utf8');

describe('schedule date helpers', () => {
  it('parses date-only values and rejects anything else', () => {
    assert.equal(toDateOnly(parseDateOnly('2026-10-10')!), '2026-10-10');
    assert.equal(parseDateOnly('10/10/2026'), null);
    assert.equal(parseDateOnly('2026-13-40'), null);
    assert.equal(parseDateOnly(null), null);
  });

  it('adds days across month boundaries', () => {
    assert.equal(toDateOnly(addDays(parseDateOnly('2026-10-29')!, 7)), '2026-11-05');
  });

  it('uses the Vietnam calendar date, not UTC', () => {
    // 18:30 UTC on the 10th is already 01:30 on the 11th in Vietnam.
    assert.equal(todayInVietnam(new Date('2026-10-10T18:30:00Z')), '2026-10-11');
    assert.equal(todayInVietnam(new Date('2026-10-10T10:00:00Z')), '2026-10-10');
    assert.equal(SHIFT_HOURS, 3);
  });
});

describe('self-service shift API source checks', () => {
  const route = read('src/app/api/schedule/my/route.ts');

  it('is limited to STAFF and DRIVER and always acts on the session user', () => {
    assert.equal(route.match(/requireRole\(\['STAFF', 'DRIVER'\]\)/g)?.length, 2);
    assert.match(route, /userId: session\.userId/);
    assert.doesNotMatch(route, /body\.userId|data\.userId/);
  });

  it('creates requests as PENDING and refuses past dates', () => {
    assert.match(route, /status: 'PENDING'/);
    assert.match(route, /parsed\.data\.shiftDate < todayInVietnam\(\)/);
  });

  it('does not let people withdraw an approved shift themselves', () => {
    assert.match(route, /existing\?\.status === 'APPROVED'/);
    assert.match(route, /status: \{ in: \['PENDING', 'REJECTED'\] \}/);
  });

  it("hides other people's rejected requests", () => {
    assert.match(route, /person\.id === session\.userId \|\| item\.status !== 'REJECTED'/);
  });
});

describe('shift review and report source checks', () => {
  it('only the manager reviews, scoped to the factory', () => {
    const review = read('src/app/api/schedule/review/route.ts');
    assert.match(review, /requireRole\(\['ADMIN'\]\)/);
    assert.match(review, /where: \{ id: \{ in: parsed\.data\.ids \}, factoryId: session\.factoryId \}/);
    assert.match(review, /reviewedAt: new Date\(\)/);
  });

  it('shifts assigned by the manager are approved', () => {
    const assignments = read('src/app/api/schedule/assignments/route.ts');
    assert.match(assignments, /status: 'APPROVED',\s*reviewedAt/);
  });

  it('the report is manager-only and counts approved shifts only', () => {
    const report = read('src/app/api/reports/shifts/route.ts');
    assert.match(report, /requireRole\(\['ADMIN'\]\)/);
    assert.match(report, /if \(item\.status === 'APPROVED'\) \{\s*row\.approvedShifts \+= 1/);
    assert.match(report, /hours: row\.approvedShifts \* SHIFT_HOURS/);
  });
});
