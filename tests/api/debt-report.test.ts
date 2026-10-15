import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const route = readFileSync(
  join(process.cwd(), 'src/app/api/reports/debt/route.ts'),
  'utf-8',
);

describe('debt report source checks', () => {
  it('computes outstanding as debt minus payment (customer owes positive)', () => {
    assert.match(route, /totalDebt\s*-\s*totalPayment/);
  });

  it('does not compute outstanding with reversed sign', () => {
    assert.doesNotMatch(route, /outstanding\s*=\s*totalPayment\s*-\s*totalDebt/);
  });

  it('sums the ledger in the database instead of loading every entry', () => {
    assert.match(route, /customerDebtLedger\.groupBy/);
    assert.doesNotMatch(route, /debtLedger:\s*true/);
  });
});
