import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { db, lockWaiters, setStock, stockOf, vietnamDayStart } from './support/db';

// The first stock movement of a day opens that day's row from yesterday's
// closing balance. Two movements at the same moment (a batch and a
// settlement) both find no row for today and both try to open it; the second
// must add to the row the first opened instead of failing.
//
// The test opens today's row itself in a transaction it keeps open, as the
// other writer would, waits until the app's insert is queued behind it on the
// unique (product, date) key, then commits.

test.describe('first stock movement of the day racing another', () => {
  test.use({ storageState: sessionFile('manager') });
  const PRODUCT = 'prod-cay-50';

  test('both movements are kept: the balance is the sum of both', async ({ request }) => {
    await setStock(PRODUCT, 100, 1); // nothing recorded today

    let pending: Promise<import('@playwright/test').APIResponse> | undefined;
    await db.$transaction(
      async (tx) => {
        // The other writer: +30 on top of yesterday's 100, not committed yet.
        await tx.inventory.create({ data: { productId: PRODUCT, date: vietnamDayStart(0), quantityOnHand: 130 } });
        pending = request.post('/api/inventory', { data: { productId: PRODUCT, quantity: 40, mode: 'ADD' } });
        await expect.poll(lockWaiters, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
      },
      { timeout: 30_000 }
    );
    const response = await pending!;

    expect(response.status()).toBe(200);
    expect(await stockOf(PRODUCT)).toBe(170);
    const rows = await db.inventory.findMany({ where: { productId: PRODUCT }, orderBy: { date: 'asc' } });
    expect(rows.map((row) => row.quantityOnHand)).toEqual([100, 170]);
  });
});
