import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const vietqr = readFileSync(
  join(process.cwd(), 'src/components/billing/VietQRCode.tsx'),
  'utf-8',
);

const webhook = readFileSync(
  join(process.cwd(), 'src/app/api/webhooks/payment/route.ts'),
  'utf-8',
);

describe('VietQR payment note source checks', () => {
  it('builds the note from the shared formatPaymentNote template', () => {
    assert.match(vietqr, /formatPaymentNote/);
    assert.match(vietqr, /vietqr-template/);
  });

  it('no longer falls back to a generic KHACH HANG name', () => {
    assert.doesNotMatch(vietqr, /KHACH HANG/);
  });
});

describe('payment webhook source checks', () => {
  it('resolves the subscription by 8-char id prefix from the note', () => {
    assert.match(webhook, /startsWith:\s*subIdPrefix|startsWith:\s*extractedId|subscription\.findFirst/);
  });
});
