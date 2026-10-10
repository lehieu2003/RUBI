import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync('src/app/api/schedule/assignments/route.ts', 'utf8');

describe('schedule assignments API source checks', () => {
  it('guards GET and PATCH for operational roles', () => {
    assert.match(source, /export async function GET/);
    assert.match(source, /export async function PATCH/);
    assert.match(source, /requireRole\(\['ADMIN'\]\)/);
  });

  it('returns weekly staff and driver assignments scoped to factoryId', () => {
    assert.match(source, /role: \{ in: \['STAFF', 'DRIVER'\] \}/);
    assert.match(source, /shiftDate: \{ gte: weekStart, lt: weekEnd \}/);
    assert.match(source, /factoryId: session\.factoryId/);
    assert.match(source, /shifts: person\.scheduleAssignments\.map/);
  });

  it('upserts and deletes one assignment per user/date', () => {
    assert.match(source, /scheduleAssignment\.deleteMany/);
    assert.match(source, /scheduleAssignment\.upsert/);
    assert.match(source, /userId_shiftDate/);
  });

  it('has no subscription-based driver limit', () => {
    assert.doesNotMatch(source, /subscription|DRIVER_LIMIT_EXCEEDED/i);
  });
});
