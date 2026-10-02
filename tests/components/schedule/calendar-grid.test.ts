import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync('src/components/schedule/calendar-grid.tsx', 'utf8');

describe('schedule calendar grid source checks', () => {
  it('renders the weekly grid and Vietnamese day headers', () => {
    assert.match(source, /grid-cols-8/);
    assert.match(source, /T2/);
    assert.match(source, /CN/);
  });

  it('renders operational shift slots across the full 24-hour day', () => {
    assert.match(source, /'SLOT_00_03'/);
    assert.match(source, /'SLOT_06_09'/);
    assert.match(source, /'SLOT_12_15'/);
    assert.match(source, /'SLOT_21_24'/);
    assert.match(source, /00:00-03:00/);
    assert.match(source, /06:00-09:00/);
    assert.match(source, /12:00-15:00/);
    assert.match(source, /21:00-24:00/);
  });

  it('shows staff and driver role labels', () => {
    assert.match(source, /ScheduleRole = 'STAFF' \| 'DRIVER'/);
    assert.match(source, /Nhân viên/);
    assert.match(source, /Tài xế/);
  });

  it('uses the locked shift color coding', () => {
    assert.match(source, /bg-container\b/);
    assert.match(source, /bg-\[#a0f399\]\/30/);
    assert.match(source, /bg-tertiary-fixed/);
    assert.match(source, /bg-container-highest/);
  });
});
