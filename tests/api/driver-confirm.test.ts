import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const confirmRoute = readFileSync(
  join(process.cwd(), 'src/app/api/orders/[id]/confirm/route.ts'),
  'utf-8',
);

const geoUtilPath = join(process.cwd(), 'src/lib/geolocation.ts');

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

  it('has a shared geolocation helper', () => {
    assert.ok(existsSync(geoUtilPath), 'src/lib/geolocation.ts must exist');
    const geo = readFileSync(geoUtilPath, 'utf-8');
    assert.match(geo, /export (async )?function getCurrentPosition/);
  });

  it('both driver pages capture GPS via the helper before confirming', () => {
    assert.match(driverPage, /getCurrentPosition/);
    assert.match(tokenPage, /getCurrentPosition/);
    assert.doesNotMatch(driverPage, /gps:\s*null/);
    assert.doesNotMatch(tokenPage, /gps:\s*null/);
  });
});
