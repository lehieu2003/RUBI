import { expect, test, type APIResponse } from '@playwright/test';
import { sessionFile } from './support/env';
import { customerNamed, db } from './support/db';

// Two managers adding the same product at the same moment. The route looks
// for a duplicate and then inserts; without a database constraint both can
// pass the look and both insert.
//
// The overlap is made certain: a transaction of the test holds the factory row
// locked, so each insert (whose foreign key needs a share lock on that row)
// queues behind it after its duplicate check has already passed. Once both are
// queued the lock is released.

/** Requests of the app waiting on a lock in the test database. */
async function lockWaiters(): Promise<number> {
  const rows = await db.$queryRaw<Array<{ n: number }>>`
    SELECT count(*)::int AS n FROM pg_stat_activity
    WHERE datname = current_database() AND wait_event_type = 'Lock'`;
  return rows[0].n;
}

async function whileFactoryLocked(
  factoryId: string,
  waiting: number,
  requests: () => Array<Promise<APIResponse>>
): Promise<APIResponse[]> {
  let pending: Array<Promise<APIResponse>> = [];
  await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM factories WHERE id = ${factoryId} FOR UPDATE`;
      pending = requests();
      await expect.poll(lockWaiters, { timeout: 15_000 }).toBeGreaterThanOrEqual(waiting);
    },
    { timeout: 30_000 }
  );
  return Promise.all(pending);
}

test.describe('product creation racing another', () => {
  test.use({ storageState: sessionFile('manager') });

  test('two creates of the same name and size: one 201, one 409, one product', async ({ request }) => {
    const { factoryId } = await customerNamed('Minh Tâm');
    const name = `Đá Đua ${Date.now().toString(36)}`;
    const create = () => request.post('/api/products', { data: { name, sizeKg: 9, price: 20000 } });

    const responses = await whileFactoryLocked(factoryId, 2, () => [create(), create()]);

    expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
    const refused = responses.find((r) => r.status() === 409)!;
    expect((await refused.json()).code).toBe('PRODUCT_EXISTS');
    expect(await db.product.count({ where: { factoryId, name, sizeKg: 9 } })).toBe(1);

    // Kept off the order grid of the other specs.
    await db.product.updateMany({ where: { factoryId, name }, data: { isActive: false } });
  });
});
