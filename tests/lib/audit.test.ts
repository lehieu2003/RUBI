import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { describeLines, describeSettlement, dong, recordAudit } from '../../src/lib/audit';

const read = (path: string) => readFileSync(path, 'utf8');

describe('audit log entries', () => {
  it('copies the actor into every entry and leaves the missing ids null', async () => {
    const written: unknown[] = [];
    const db = { auditLog: { createMany: async ({ data }: { data: unknown[] }) => (written.push(...data), { count: data.length }) } };
    const actor = { factoryId: 'f1', userId: 'u1', userName: 'Lê Văn Lên Đơn' };
    await recordAudit(db as never, actor, [
      { action: 'ORDER_ASSIGNED', orderId: 'o1', customerId: 'c1', summary: 'Giao cho tài xế A' },
      { action: 'DEBT_PAYMENT', customerId: 'c1', summary: 'Thu tiền' },
    ]);
    assert.deepEqual(written, [
      { ...actor, action: 'ORDER_ASSIGNED', orderId: 'o1', customerId: 'c1', summary: 'Giao cho tài xế A' },
      { ...actor, action: 'DEBT_PAYMENT', orderId: null, customerId: 'c1', summary: 'Thu tiền' },
    ]);
  });

  it('describes order lines, money and what settlement found', () => {
    assert.equal(describeLines([{ name: 'Đá Bi', sizeKg: 5, quantity: 3 }, { name: 'Đá Viên', sizeKg: 10, quantity: 2 }]), 'Đá Bi 5kg × 3, Đá Viên 10kg × 2');
    assert.equal(dong(1250000), '1.250.000đ');
    assert.equal(describeSettlement([{ name: 'Đá Bi', sizeKg: 5, ordered: 3, delivered: 3 }]), 'giao đủ');
    assert.equal(
      describeSettlement([
        { name: 'Đá Bi', sizeKg: 5, ordered: 3, delivered: 2 },
        { name: 'Đá Viên', sizeKg: 10, ordered: 2, delivered: 2 },
      ]),
      'Đá Bi 5kg đặt 3, thực giao 2'
    );
  });
});

describe('audit log source checks', () => {
  it('every change to an order or to a debt writes its entry in the same transaction', () => {
    const inTransaction: Record<string, RegExp> = {
      'src/lib/actions/orders.ts': /await recordAudit\(tx, actor, \{\s*action: 'ORDER_CREATED'/,
      'src/app/api/orders/bulk-assign/route.ts': /await recordAudit\(\s*tx,[\s\S]*?action: 'ORDER_ASSIGNED'/,
      'src/app/api/orders/[id]/confirm/route.ts': /await recordAudit\(\s*tx,[\s\S]*?action: 'ORDER_DELIVERED'/,
      'src/app/api/orders/[id]/reconcile/route.ts': /await recordAudit\(\s*tx,[\s\S]*?action: 'ORDER_SETTLED'/,
      'src/app/api/customers/[id]/payments/route.ts': /await recordAudit\(\s*tx,[\s\S]*?action: 'DEBT_PAYMENT'/,
      'src/app/api/orders/[id]/status/route.ts': /prisma\.\$transaction\(\[\s*prisma\.order\.update\([\s\S]*?recordAudit\(\s*prisma,[\s\S]*?'ORDER_CANCELLED' : 'ORDER_STATUS_CHANGED'/,
    };
    for (const [file, pattern] of Object.entries(inTransaction)) {
      assert.match(read(file), pattern, file);
    }
  });

  it('the log is read by the manager only and scoped to the factory', () => {
    const route = read('src/app/api/audit-logs/route.ts');
    assert.match(route, /requireRole\(\['ADMIN'\]\)/);
    assert.match(route, /factoryId: session\.factoryId,/);
    assert.doesNotMatch(route, /export async function (POST|PATCH|PUT|DELETE)/);
  });

  it('nothing in the app edits or deletes an entry', () => {
    const hits = execSync("grep -rnE 'auditLog\\.(update|delete|upsert)' src || true", { encoding: 'utf8' }).trim();
    assert.equal(hits, '');
  });
});
