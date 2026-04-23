import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync('src/components/dashboard/sidebar.tsx', 'utf8');

describe('sidebar schedule link source checks', () => {
  it('adds schedule metadata with a calendar icon', () => {
    assert.match(source, /Calendar/);
    assert.match(source, /'\/schedule': \{ icon: Calendar, label: 'Lịch trình' \}/);
  });
});
