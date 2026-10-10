import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const confirmRoute = readFileSync(
  join(process.cwd(), 'src/app/api/orders/[id]/confirm/route.ts'),
  'utf-8',
);

const driverPage = readFileSync(
  join(process.cwd(), 'src/app/driver/page.tsx'),
  'utf-8',
);

const tokenPage = readFileSync(
  join(process.cwd(), 'src/app/d/[token]/page.tsx'),
  'utf-8',
);

describe('driver confirm source checks', () => {
  it('records deliveredAt when confirming delivery', () => {
    assert.match(confirmRoute, /deliveredAt:\s*new Date\(\)/);
  });

  it('confirms delivery without capturing GPS', () => {
    assert.doesNotMatch(confirmRoute, /gps/i);
    assert.doesNotMatch(driverPage, /getCurrentPosition|gps/i);
    assert.doesNotMatch(tokenPage, /getCurrentPosition|gps/i);
  });
});
