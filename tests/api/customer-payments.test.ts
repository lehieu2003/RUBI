import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { RecordPaymentBody } from '../../src/lib/contracts/customers';

const read = (path: string) => readFileSync(path, 'utf8');

describe('payment request schema', () => {
  it('accepts a whole, positive amount with an optional note', () => {
    assert.ok(RecordPaymentBody.safeParse({ amount: 150000 }).success);
    assert.deepEqual(RecordPaymentBody.parse({ amount: 1, notes: '  tiền mặt  ' }), { amount: 1, notes: 'tiền mặt' });
  });

  it('rejects zero, negative, fractional, textual and absurd amounts', () => {
    for (const amount of [0, -1000, 1000.5, '150000', null, undefined, Number.NaN, 10_000_000_001]) {
      assert.equal(RecordPaymentBody.safeParse({ amount }).success, false, String(amount));
    }
  });

  it('answers in Vietnamese', () => {
    const issue = (body: unknown) => RecordPaymentBody.safeParse(body).error?.issues[0]?.message;
    assert.equal(issue({ amount: 0 }), 'Số tiền phải lớn hơn 0');
    assert.equal(issue({ amount: 10.5 }), 'Số tiền phải là số nguyên (VND)');
    assert.equal(issue({}), 'Vui lòng nhập số tiền');
  });
});

describe('record payment API source checks', () => {
  const route = read('src/app/api/customers/[id]/payments/route.ts');

  it('is manager-only and scoped to the factory', () => {
    assert.match(route, /requireRole\(\['ADMIN'\]\)/);
    assert.match(route, /where: \{ id, factoryId: session\.factoryId \}/);
  });

  it('validates with the contract schema', () => {
    assert.match(route, /RecordPaymentBody\.safeParse/);
  });

  it('checks the debt and writes the payment in one serializable transaction', () => {
    assert.match(route, /prisma\.\$transaction\(/);
    assert.match(route, /isolationLevel: 'Serializable'/);
    const transaction = route.slice(route.indexOf('prisma.$transaction('), route.indexOf("isolationLevel: 'Serializable'"));
    assert.match(transaction, /groupBy\(/);
    assert.match(transaction, /if \(amount > owed\)/);
    assert.match(transaction, /type: 'PAYMENT'/);
  });

  it('refuses a payment larger than the debt with a clear code', () => {
    assert.match(route, /409,\s*'PAYMENT_EXCEEDS_DEBT'/);
  });

  it('returns money as numbers', () => {
    assert.match(route, /amount: payment\.amount\.toNumber\(\)/);
  });
});

describe('customer ledger API source checks', () => {
  const route = read('src/app/api/customers/[id]/ledger/route.ts');

  it('is manager-only, scoped and paginated with a stable order', () => {
    assert.match(route, /requireRole\(\['ADMIN'\]\)/);
    assert.match(route, /where: \{ id, factoryId: session\.factoryId \}/);
    assert.match(route, /parsePagination\(/);
    assert.match(route, /orderBy: \[\{ createdAt: 'desc' \}, \{ id: 'desc' \}\]/);
    assert.match(route, /paginationMeta\(pageRequest, totalItem\)/);
  });
});

describe('debt report page', () => {
  const page = read('src/app/reports/debt/page.tsx');
  const dialogs = read('src/components/debt/payment-dialogs.tsx');

  it('offers "Thu tiền" and "Lịch sử" per customer and reloads after a payment', () => {
    assert.match(page, /Thu tiền/);
    assert.match(page, /Lịch sử/);
    assert.match(page, /onRecorded=\{\(\) => \{\s*setPaying\(null\);\s*void fetchDebts\(\);/);
  });

  it('the payment dialog blocks an amount above the debt before calling the server', () => {
    assert.match(dialogs, /value > customer\.outstandingDebt/);
    assert.match(dialogs, /(?:API_ENDPOINTS\.CUSTOMERS|CUSTOMER_ENDPOINTS)\.PAYMENTS\(customer\.customerId\)/);
    assert.match(dialogs, /Thu đủ/);
  });

  it('the history dialog is paginated', () => {
    assert.match(dialogs, /(?:API_ENDPOINTS\.CUSTOMERS|CUSTOMER_ENDPOINTS)\.LEDGER\(customer\.customerId\)\}\?page=\$\{page\}&limit=10/);
    assert.match(dialogs, /<Pagination meta=\{meta\}/);
  });
});
