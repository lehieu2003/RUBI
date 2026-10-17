import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { customerNamed, db } from './support/db';

// Idempotency keys only matter while a submission can still be resent: keys
// older than 30 days are deleted when a new key is claimed, with no scheduler.

const DAY = 24 * 60 * 60 * 1000;

test.describe('old idempotency keys are pruned', () => {
  test.use({ storageState: sessionFile('staff') });

  test('claiming a key deletes keys older than 30 days and keeps the recent ones', async ({ request }) => {
    const customer = await customerNamed('Năm Căn');
    const seed = (daysAgo: number) =>
      db.idempotencyKey.create({
        data: {
          factoryId: customer.factoryId,
          key: `prune-${randomUUID()}`,
          scope: 'POST /api/orders',
          requestHash: 'seeded',
          status: 201,
          response: {},
          createdAt: new Date(Date.now() - daysAgo * DAY),
        },
      });
    const old = await seed(31);
    const recent = await seed(29);

    const key = randomUUID();
    const res = await request.post('/api/orders', {
      data: { customerId: customer.id, items: [{ productId: 'prod-vien-10', quantity: 1 }] },
      headers: { 'Idempotency-Key': key },
    });
    expect(res.status()).toBe(201);

    expect(await db.idempotencyKey.findUnique({ where: { id: old.id } })).toBeNull();
    expect(await db.idempotencyKey.findUnique({ where: { id: recent.id } })).not.toBeNull();
    expect(
      await db.idempotencyKey.findUnique({ where: { factoryId_key: { factoryId: customer.factoryId, key } } })
    ).not.toBeNull();

    await db.idempotencyKey.delete({ where: { id: recent.id } });
  });
});
