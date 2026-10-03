import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync('src/components/landing/support-chat.tsx', 'utf8');
const content = readFileSync('src/components/landing/support-chat-content.ts', 'utf8');
const page = readFileSync('src/app/page.tsx', 'utf8');

describe('landing support chat widget', () => {
  it('is client-only with no network calls (canned answers, no LLM)', () => {
    assert.match(source, /'use client'/);
    assert.doesNotMatch(source, /fetch\(/);
    assert.doesNotMatch(source, /axios/);
  });

  it('launcher stacks above the Zalo button at the same z-index', () => {
    const launcher = source.split('\n').find((l) => l.includes('bottom-[76px]'));
    assert.ok(launcher, 'launcher fixed position not found');
    assert.match(launcher, /sm:bottom-\[92px\]/);
    assert.match(launcher, /z-40/);
  });

  it('panel anchors above the launcher on mobile and desktop', () => {
    const panel = source.split('\n').find((l) => l.includes('bottom-[132px]'));
    assert.ok(panel, 'panel fixed position not found');
    assert.match(panel, /sm:bottom-\[156px\]/);
  });

  it('canned Q&A mirrors landing pricing facts', () => {
    assert.match(content, /150\.000đ\/tài xế\/tháng/);
    assert.match(content, /300\.000đ\/tháng/);
    assert.match(content, /14 ngày/);
  });

  it('hands off to the shared Zalo URL with safe external link attrs', () => {
    assert.match(source, /from '@\/components\/landing\/zalo-button'/);
    const zaloLinks = source.match(/rel="noopener noreferrer"/g) ?? [];
    assert.ok(zaloLinks.length >= 2, 'expected inline + footer Zalo links');
  });

  it('panel is a labelled dialog dismissible via Escape', () => {
    assert.match(source, /role="dialog"/);
    assert.match(source, /aria-label="Chat hỗ trợ IceFlow"/);
    assert.match(source, /'Escape'/);
    assert.match(source, /aria-expanded=\{open\}/);
  });

  it('is mounted on the landing page next to the Zalo button', () => {
    assert.match(page, /<SupportChat \/>/);
    assert.match(page, /<ZaloFloatingButton \/>/);
  });
});
