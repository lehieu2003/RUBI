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

describe('sidebar stacking order', () => {
  const sidebar = readFileSync('src/components/dashboard/sidebar.tsx', 'utf8');

  it('sits below the modal layer (z-30) so drawers and dialogs cover it', () => {
    const asideLine = sidebar.split('\n').find((l) => l.includes('fixed left-0 top-0'));
    assert.ok(asideLine, 'sidebar aside element not found');
    assert.match(asideLine, /z-30/);
    assert.doesNotMatch(asideLine, /z-50/);
  });
});

describe('settings lives inside the main menu', () => {
  const sidebar = readFileSync('src/components/dashboard/sidebar.tsx', 'utf8');

  it('does not filter /settings out of the operational menu items', () => {
    assert.doesNotMatch(sidebar, /item\.href !== '\/settings'/);
  });

  it('has no separate settings block at the bottom', () => {
    assert.doesNotMatch(sidebar, /\{\/\* Settings Link \*\//);
    assert.doesNotMatch(sidebar, /title="Cài đặt hệ thống"/);
  });
});

describe('mobile menu stacking', () => {
  const sidebar = readFileSync('src/components/dashboard/sidebar.tsx', 'utf8');

  it('mobile backdrop sits BELOW the sidebar so menu items stay clickable', () => {
    const backdropLine = sidebar.split('\n').find((l) => l.includes('bg-black/50') && l.includes('lg:hidden'));
    assert.ok(backdropLine, 'mobile backdrop not found');
    assert.match(backdropLine, /z-20/);
    assert.doesNotMatch(backdropLine, /z-40|z-50/);
  });
});
