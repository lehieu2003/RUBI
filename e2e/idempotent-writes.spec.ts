import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { Prisma } from '@prisma/client';
import { sessionFile } from './support/env';
import { customerNamed, db, setStock, stockOf } from './support/db';

// Recording a payment, adding shells and recording a production batch add to
// a balance. If the same submission reaches the server twice (a retry after a
// lost response, a second tap, a second device) it must be written once. The
// client sends an Idempotency-Key header, one per submission; a repeat with
// that key gets the first answer back and writes nothing.
//
// The concurrent case holds the row the write needs locked, waits until both
// requests are queued in the database, then lets them go, so they overlap for
// certain instead of by luck.

const HEADER = 'Idempotency-Key';

/** Requests of the app waiting on a lock in the test database. */
async function lockWaiters(): Promise<number> {
  const rows = await db.$queryRaw<Array<{ n: number }>>`
    SELECT count(*)::int AS n FROM pg_stat_activity
    WHERE datname = current_database() AND wait_event_type = 'Lock'`;
  return rows[0].n;
}

interface AdditiveWrite {
  name: string;
  /** HTTP status of a successful write */
  status: number;
  /** Puts the balance in a known state. */
  arrange(): Promise<void>;
  /** Sends the write; `other` changes the amount, as a different submission would. */
  send(request: APIRequestContext, key?: string, other?: boolean): Promise<APIResponse>;
  /** How many times the write has been applied since arrange(). */
  writes(): Promise<number>;
  /** Locks the row the write has to change, inside the test's transaction. */
  lock(tx: Prisma.TransactionClient): Promise<unknown>;
}

const headers = (key?: string) => (key ? { [HEADER]: key } : undefined);

const PAY_CUSTOMER = 'Hướng Dương';
const SHELL_CUSTOMER = 'Ding Tea';
const PRODUCT = 'prod-mi-20';

const payment: AdditiveWrite = {
  name: 'payment',
  status: 201,
  async arrange() {
    const customer = await customerNamed(PAY_CUSTOMER);
    await db.customerDebtLedger.deleteMany({ where: { customerId: customer.id } });
    await db.customerDebtLedger.create({ data: { customerId: customer.id, type: 'DEBT', amount: 1_000_000 } });
  },
  async send(request, key, other) {
    const customer = await customerNamed(PAY_CUSTOMER);
    return request.post(`/api/customers/${customer.id}/payments`, {
      data: { amount: other ? 200_000 : 100_000, notes: 'tiền mặt' },
      headers: headers(key),
    });
  },
  async writes() {
    const customer = await customerNamed(PAY_CUSTOMER);
    return db.customerDebtLedger.count({ where: { customerId: customer.id, type: 'PAYMENT' } });
  },
  async lock(tx) {
    const customer = await customerNamed(PAY_CUSTOMER);
    // The payment row references the customer, so its insert waits on this.
    return tx.$queryRaw`SELECT id FROM customers WHERE id = ${customer.id} FOR UPDATE`;
  },
};

const shells: AdditiveWrite = {
  name: 'shells added',
  status: 200,
  async arrange() {
    const customer = await customerNamed(SHELL_CUSTOMER);
    await db.customerShellDeposit.upsert({
      where: { customerId: customer.id },
      create: { customerId: customer.id, shellsOut: 0, shellsIn: 0, depositPerShell: 50000 },
      update: { shellsOut: 0, shellsIn: 0 },
    });
  },
  async send(request, key, other) {
    const customer = await customerNamed(SHELL_CUSTOMER);
    return request.patch('/api/deposits/shells', {
      data: { customerId: customer.id, shellsOut: other ? 4 : 3, mode: 'ADD' },
      headers: headers(key),
    });
  },
  async writes() {
    const customer = await customerNamed(SHELL_CUSTOMER);
    const deposit = await db.customerShellDeposit.findUniqueOrThrow({ where: { customerId: customer.id } });
    return deposit.shellsOut / 3;
  },
  async lock(tx) {
    const customer = await customerNamed(SHELL_CUSTOMER);
    return tx.$queryRaw`SELECT id FROM customer_shell_deposits WHERE customer_id = ${customer.id} FOR UPDATE`;
  },
};

const batch: AdditiveWrite = {
  name: 'production batch',
  status: 200,
  async arrange() {
    await setStock(PRODUCT, 100); // today's row, so the batch updates it
  },
  async send(request, key, other) {
    return request.post('/api/inventory', {
      data: { productId: PRODUCT, quantity: other ? 11 : 10, mode: 'ADD' },
      headers: headers(key),
    });
  },
  async writes() {
    return (((await stockOf(PRODUCT)) ?? 100) - 100) / 10;
  },
  async lock(tx) {
    return tx.$queryRaw`SELECT id FROM inventory WHERE product_id = ${PRODUCT} FOR UPDATE`;
  },
};

test.describe('a repeated submission is written once', () => {
  test.use({ storageState: sessionFile('manager') });

  for (const write of [payment, shells, batch]) {
    test.describe(write.name, () => {
      test.beforeEach(() => write.arrange());

      test('sent twice with the same key: one write, the same answer twice', async ({ request }) => {
        const key = randomUUID();
        const first = await write.send(request, key);
        const second = await write.send(request, key);

        expect(first.status()).toBe(write.status);
        expect(second.status()).toBe(first.status());
        expect(await second.json()).toEqual(await first.json());
        expect(await write.writes()).toBe(1);
      });

      test('sent twice at the same moment with the same key: one write, the same answer twice', async ({ request }) => {
        const key = randomUUID();
        let pending: Array<Promise<APIResponse>> = [];
        await db.$transaction(
          async (tx) => {
            await write.lock(tx);
            pending = [write.send(request, key), write.send(request, key)];
            await expect.poll(lockWaiters, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
          },
          { timeout: 30_000 }
        );
        const [first, second] = await Promise.all(pending);

        expect([first.status(), second.status()]).toEqual([write.status, write.status]);
        expect(await second.json()).toEqual(await first.json());
        expect(await write.writes()).toBe(1);
      });

      test('two submissions with their own keys are both written', async ({ request }) => {
        expect((await write.send(request, randomUUID())).status()).toBe(write.status);
        expect((await write.send(request, randomUUID())).status()).toBe(write.status);
        expect(await write.writes()).toBe(2);
      });

      test('without a key every request is written, as before', async ({ request }) => {
        expect((await write.send(request)).status()).toBe(write.status);
        expect((await write.send(request)).status()).toBe(write.status);
        expect(await write.writes()).toBe(2);
      });

      test('a key reused with a different amount is refused and writes nothing', async ({ request }) => {
        const key = randomUUID();
        expect((await write.send(request, key)).status()).toBe(write.status);
        const reused = await write.send(request, key, true);

        expect(reused.status()).toBe(422);
        expect((await reused.json()).code).toBe('IDEMPOTENCY_KEY_REUSED');
        expect(await write.writes()).toBe(1);
      });
    });
  }

  test('a key reused on another kind of write is refused and writes nothing', async ({ request }) => {
    await payment.arrange();
    await shells.arrange();
    const key = randomUUID();
    expect((await payment.send(request, key)).status()).toBe(201);
    const reused = await shells.send(request, key);

    expect(reused.status()).toBe(422);
    expect((await reused.json()).code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await shells.writes()).toBe(0);
    expect(await payment.writes()).toBe(1);
  });
});
