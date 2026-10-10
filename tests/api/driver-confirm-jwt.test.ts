import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const confirmRoute = readFileSync(
  join(process.cwd(), 'src/app/api/orders/[id]/confirm/route.ts'),
  'utf-8',
);

describe('driver confirm requires a signed-in driver', () => {
  it('resolves the driver from the session only (cookie or Bearer JWT via getSession)', () => {
    assert.match(confirmRoute, /const driver = await getSessionDriver\(\);/);
    assert.match(confirmRoute, /requireRole\(\['DRIVER'\]\)/);
  });

  it('has no share-link token path left', () => {
    assert.doesNotMatch(confirmRoute, /bodyToken|where:\s*\{\s*token|authHeader/);
  });

  it('only confirms an order assigned to that driver', () => {
    assert.match(confirmRoute, /order\.driverId !== driver\.id/);
  });
});
