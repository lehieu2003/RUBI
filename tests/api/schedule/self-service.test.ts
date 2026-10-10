import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  SHIFT_HOURS,
  addDays,
  formatMonthVi,
  hourInVietnam,
  monthOf,
  parseDateOnly,
  shiftEndHour,
  toDateOnly,
  todayInVietnam,
} from '../../../src/lib/schedule';

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
    assert.match(route, /parsed\.data\.shiftDate < today\b/);
    assert.match(route, /shiftEndHour\(parsed\.data\.shift\) <= hourInVietnam\(\)/);
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

describe('shift rules: ended slots, per-shift limits, payroll lock', () => {
  it('knows the factory hour and when a slot ends', () => {
    assert.equal(hourInVietnam(new Date('2026-10-10T02:15:00Z')), 9);
    assert.equal(hourInVietnam(new Date('2026-10-10T18:30:00Z')), 1);
    assert.equal(shiftEndHour('SLOT_06_09'), 9);
    assert.equal(shiftEndHour('SLOT_21_24'), 24);
    assert.equal(monthOf('2026-10-05'), '2026-10');
    assert.equal(formatMonthVi('2026-03'), '3/2026');
  });

  it('self-registration respects the per-role limit, counting pending and approved', () => {
    const route = read('src/app/api/schedule/my/route.ts');
    assert.match(route, /session\.role === 'DRIVER' \? factory\?\.maxDriversPerShift : factory\?\.maxStaffPerShift/);
    assert.match(route, /status: \{ in: \['PENDING', 'APPROVED'\] \}/);
    assert.match(route, /SHIFT_FULL/);
  });

  it('every route that changes shifts refuses a closed payroll month', () => {
    for (const file of [
      'src/app/api/schedule/my/route.ts',
      'src/app/api/schedule/assignments/route.ts',
      'src/app/api/schedule/review/route.ts',
    ]) {
      assert.match(read(file), /rejectIfMonthLocked\(/, `${file} must check the payroll lock`);
    }
    assert.match(read('src/lib/payroll-lock.ts'), /PAYROLL_LOCKED/);
  });

  it('only the manager closes a month, and not while requests are pending', () => {
    const lock = read('src/app/api/reports/shifts/lock/route.ts');
    assert.match(lock, /requireRole\(\['ADMIN'\]\)/);
    assert.match(lock, /status: 'PENDING'/);
    assert.match(lock, /PENDING_SHIFTS/);
    assert.match(lock, /payrollLock\.deleteMany/);
  });
});
