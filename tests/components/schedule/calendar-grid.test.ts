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

  it('renders operational shift slots for morning, noon, afternoon, and evening', () => {
    assert.match(source, /'MORNING'/);
    assert.match(source, /'NOON'/);
    assert.match(source, /'AFTERNOON'/);
    assert.match(source, /'EVENING'/);
    assert.match(source, /Sáng/);
    assert.match(source, /Trưa/);
    assert.match(source, /Chiều/);
    assert.match(source, /Tối/);
  });

  it('shows staff and driver role labels', () => {
    assert.match(source, /ScheduleRole = 'STAFF' \| 'DRIVER'/);
    assert.match(source, /Nhân viên/);
    assert.match(source, /Tài xế/);
  });

  it('uses the locked shift color coding', () => {
    assert.match(source, /bg-amber-500\/15/);
    assert.match(source, /bg-cyan-500\/15/);
    assert.match(source, /bg-blue-500\/15/);
    assert.match(source, /bg-violet-500\/15/);
  });
});
