import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const route = readFileSync(
  join(process.cwd(), 'src/app/api/webhooks/payment/route.ts'),
  'utf-8',
);

describe('payment webhook secret enforcement', () => {
  it('rejects all webhooks in production when PAYMENT_WEBHOOK_SECRET is unset', () => {
    assert.match(route, /NODE_ENV\s*===?\s*'production'/);
    assert.match(route, /PAYMENT_WEBHOOK_SECRET/);
    // The fail-closed guard must come before any parsing/activation logic
    const guardIdx = route.search(/NODE_ENV\s*===?\s*'production'/);
    const parseIdx = route.indexOf('await req.json()');
    assert.ok(guardIdx > -1 && parseIdx > -1 && guardIdx < parseIdx,
      'production guard must run before request parsing');
  });

  it('still verifies the provided secret in development when configured', () => {
    assert.match(route, /providedToken !== webhookSecret/);
  });
});
