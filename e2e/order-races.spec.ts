import { expect, test, type APIResponse } from '@playwright/test';
import { sessionFile } from './support/env';
import { createOrder, db, setStock, stockOf } from './support/db';

// Two people acting on one order at the same moment. The status is checked
// on a read and then written; the write must check it again, or the second
// request overwrites what the first one did.
//
// Each test makes the overlap certain instead of hoping for it: it locks the
// order row in a transaction of its own (optionally changing the status, as
// the other person would), waits until the app's requests are queued behind
// that lock, then lets them go.

const CUSTOMER = 'Minh Tâm';
const PRODUCT = 'prod-bi-5';

/** Requests of the app waiting on a row lock in the test database. */
async function lockWaiters(): Promise<number> {
  const rows = await db.$queryRaw<Array<{ n: number }>>`
    SELECT count(*)::int AS n FROM pg_stat_activity
    WHERE datname = current_database() AND wait_event_type = 'Lock'`;
  return rows[0].n;
}

/**
 * Holds the order row locked, optionally changes its status as a concurrent
 * request would, starts `requests` and releases the lock once `waiting` of
 * them are queued behind it. Returns their responses.
 */
async function whileOrderLocked(
  orderId: string,
  options: { setStatus?: 'COMPLETED' | 'CANCELLED'; waiting: number },
  requests: () => Array<Promise<APIResponse>>
): Promise<APIResponse[]> {
  let pending: Array<Promise<APIResponse>> = [];
  await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      if (options.setStatus) {
        await tx.order.update({ where: { id: orderId }, data: { status: options.setStatus } });
      }
      pending = requests();
      await expect.poll(lockWaiters, { timeout: 15_000 }).toBeGreaterThanOrEqual(options.waiting);
    },
    { timeout: 30_000 }
  );
  return Promise.all(pending);
}

async function deliveredOrder(quantity = 2) {
  return createOrder({ customerPart: CUSTOMER, productId: PRODUCT, quantity, status: 'DELIVERED' });
}

const debtRowsOf = (orderId: string) =>
  db.customerDebtLedger.count({ where: { type: 'DEBT', notes: `Order ${orderId} delivered` } });

test.describe('settlement racing another change', () => {
  test.use({ storageState: sessionFile('manager') });

  test('two settlements of one order: one wins, debt and stock are booked once', async ({ request }) => {
    await setStock(PRODUCT, 100);
    const order = await deliveredOrder(2);
    const items = order.orderItems.map((item) => ({ id: item.id, actualQty: item.quantity }));
    const settle = () => request.patch(`/api/orders/${order.id}/reconcile`, { data: { items } });

    const responses = await whileOrderLocked(order.id, { waiting: 2 }, () => [settle(), settle()]);

    expect(responses.map((r) => r.status()).sort()).toEqual([200, 409]);
    expect(await debtRowsOf(order.id)).toBe(1);
    expect(await stockOf(PRODUCT)).toBe(98);
  });

  test('an order cancelled while being settled stays cancelled, with no debt', async ({ request }) => {
    await setStock(PRODUCT, 100);
    const order = await deliveredOrder(2);
    const items = order.orderItems.map((item) => ({ id: item.id, actualQty: item.quantity }));

    const [response] = await whileOrderLocked(order.id, { setStatus: 'CANCELLED', waiting: 1 }, () => [
      request.patch(`/api/orders/${order.id}/reconcile`, { data: { items } }),
    ]);

    expect(response.status()).toBe(409);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('CANCELLED');
    expect(await debtRowsOf(order.id)).toBe(0);
    expect(await stockOf(PRODUCT)).toBe(100);
  });
});

test.describe('status change racing another change', () => {
  test.use({ storageState: sessionFile('staff') });

  test('a status change does not reopen an order settled in the meantime', async ({ request }) => {
    const order = await deliveredOrder();

    const [response] = await whileOrderLocked(order.id, { setStatus: 'COMPLETED', waiting: 1 }, () => [
      request.patch(`/api/orders/${order.id}/status`, { data: { status: 'PENDING' } }),
    ]);

    expect(response.status()).toBe(409);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('COMPLETED');
  });

  test('a stale screen does not erase a delivery the driver has confirmed', async ({ request }) => {
    // Staff loaded the order while it was SHIPPING; the driver has since confirmed it.
    const order = await deliveredOrder();

    const response = await request.patch(`/api/orders/${order.id}/status`, {
      data: { status: 'PENDING', expectedStatus: 'SHIPPING' },
    });

    expect(response.status()).toBe(409);
    expect((await response.json()).code).toBe('ORDER_STATUS_CHANGED');
    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe('DELIVERED');
    expect(after.deliveredAt).not.toBeNull();
  });

  test('a change from the status the screen showed still goes through', async ({ request }) => {
    const order = await deliveredOrder();

    const response = await request.patch(`/api/orders/${order.id}/status`, {
      data: { status: 'SHIPPING', expectedStatus: 'DELIVERED' },
    });

    expect(response.status()).toBe(200);
    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe('SHIPPING');
    expect(after.deliveredAt).toBeNull();
  });
});
