import { randomUUID } from 'node:crypto';
import { expect, test, type APIResponse } from '@playwright/test';
import { sessionFile } from './support/env';
import { customerNamed, db, lockWaiters } from './support/db';

// A payment checks the debt and writes in one Serializable transaction, so
// two payments at the same moment cannot both pass the check. When they do
// overlap, Postgres cancels one of them with a serialization failure; that
// one can simply run again, and must, instead of answering 500.
//
// The overlap is forced: a stand-in holds the payment's Idempotency-Key
// uncommitted, so the payment's transaction starts and then waits on the key.
// Meanwhile another payment of the same customer is written and committed.
// When the stand-in steps back, the payment goes on with a view of the debt
// from before that other payment, and Postgres cancels it.

const CUSTOMER = 'Hướng Dương';

class StepBack extends Error {}

test.describe('a payment overlapping another payment of the customer', () => {
  test.use({ storageState: sessionFile('manager') });

  test('is run again and written, with the debt left after both', async ({ request }) => {
    const customer = await customerNamed(CUSTOMER);
    await db.customerDebtLedger.deleteMany({ where: { customerId: customer.id } });
    await db.customerDebtLedger.create({ data: { customerId: customer.id, type: 'DEBT', amount: 1_000_000 } });
    const key = randomUUID();

    let pending: Promise<APIResponse> | undefined;
    await db
      .$transaction(
        async (standIn) => {
          await standIn.idempotencyKey.create({
            data: { factoryId: customer.factoryId, key, scope: 'stand-in', requestHash: 'stand-in' },
          });
          pending = request.post(`/api/customers/${customer.id}/payments`, {
            data: { amount: 100_000, notes: 'tiền mặt' },
            headers: { 'Idempotency-Key': key },
          });
          await expect.poll(lockWaiters, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);

          // The other payment: reads the debt and writes, as the route does.
          await db.$transaction(
            async (tx) => {
              await tx.customerDebtLedger.groupBy({ by: ['type'], where: { customerId: customer.id }, _sum: { amount: true } });
              await tx.customerDebtLedger.create({ data: { customerId: customer.id, type: 'PAYMENT', amount: 100_000 } });
            },
            { isolationLevel: 'Serializable' }
          );
          throw new StepBack();
        },
        { timeout: 30_000 }
      )
      .catch((error) => {
        if (!(error instanceof StepBack)) throw error;
      });
    const response = await pending!;

    expect(response.status()).toBe(201);
    expect((await response.json()).data.outstandingDebt).toBe(800_000);
    expect(await db.customerDebtLedger.count({ where: { customerId: customer.id, type: 'PAYMENT' } })).toBe(2);
    const stored = await db.idempotencyKey.findUniqueOrThrow({
      where: { factoryId_key: { factoryId: customer.factoryId, key } },
    });
    expect(stored.status).toBe(201);
  });
});
