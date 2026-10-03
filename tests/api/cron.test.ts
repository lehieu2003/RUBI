import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const cron = readFileSync(
  join(process.cwd(), 'src/app/api/cron/subscription-warnings/route.ts'),
  'utf8',
);

const health = readFileSync(join(process.cwd(), 'src/app/api/health/route.ts'), 'utf8');

describe('cron subscription-warnings source checks', () => {
  it('fails closed in production without CRON_SECRET (like the payment webhook)', () => {
    assert.match(cron, /NODE_ENV\s*===?\s*'production'/);
    assert.match(cron, /CRON_SECRET/);
  });

  it('verifies the bearer secret when one is configured', () => {
    assert.match(cron, /provided !== cronSecret/);
  });

  it('emails exactly at 3 and 1 days remaining (no daily spam)', () => {
    assert.match(cron, /WARNING_DAYS = \[3, 1\]/);
    assert.match(cron, /WARNING_DAYS\.includes\(daysRemaining\)/);
  });

  it('emails the active factory admins only', () => {
    assert.match(cron, /role: 'ADMIN', isActive: true/);
  });
});

describe('health endpoint source checks', () => {
  it('pings the database and reports status without secrets', () => {
    assert.match(health, /SELECT 1/);
    assert.match(health, /db: 'up'/);
    assert.match(health, /503/);
  });
});
