import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('order drawer initial focus', () => {
  it('the drawer starts on the field marked data-autofocus, else on its first control', () => {
    const drawer = readFileSync('src/components/ui/drawer.tsx', 'utf8');
    assert.match(drawer, /querySelector<HTMLElement>\('\[data-autofocus\]'\) \?\? focusable\[0\]/);
  });

  it('order entry opens with the cursor in the customer search', () => {
    assert.match(readFileSync('src/components/order/search-bar.tsx', 'utf8'), /data-autofocus/);
  });
});
