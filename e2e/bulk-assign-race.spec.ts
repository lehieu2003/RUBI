import { expect, test, type APIResponse } from '@playwright/test';
import { sessionFile } from './support/env';
import { createOrder, db, lockWaiters } from './support/db';

// The office assigns orders to a driver while the manager locks that
// driver's account. Locking hands the driver's open orders back to the
// office; an assignment that checked the driver just before must not put
// orders on the locked driver afterwards.
//
// The test locks the driver's account in a transaction it keeps open, as the
// manager's request would, waits until the assignment is queued behind it,
// then commits.

test.describe('assigning orders to a driver being locked', () => {
  test.use({ storageState: sessionFile('staff') });
  const EMAIL = 'taixe-race@miendong.vn';
  let orderIds: string[] = [];

  test.afterAll(async () => {
    await db.order.updateMany({ where: { id: { in: orderIds } }, data: { driverId: null } });
    await db.driver.deleteMany({ where: { user: { email: EMAIL } } });
    await db.user.deleteMany({ where: { email: EMAIL } });
  });

  test('the assignment is refused and the order stays unassigned', async ({ request }) => {
    const factoryId = (await db.user.findUniqueOrThrow({ where: { email: 'quanly@rubi.local' } })).factoryId!;
    const user = await db.user.create({
      data: { email: EMAIL, name: 'Tài Xế Đua', password: 'x', role: 'DRIVER', factoryId },
    });
    const driver = await db.driver.create({ data: { name: user.name, factoryId, userId: user.id } });
    const order = await createOrder({ customerPart: 'Minh Tâm', productId: 'prod-bi-5', quantity: 1 });
    orderIds = [order.id];

    let pending: Promise<APIResponse> | undefined;
    await db.$transaction(
      async (tx) => {
        // The manager locks the account, as PATCH /api/staff/[id] does, and
        // has not committed yet; the order row is held too.
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`;
        await tx.user.update({ where: { id: user.id }, data: { isActive: false } });
        await tx.driver.update({ where: { id: driver.id }, data: { isActive: false } });
        await tx.order.updateMany({
          where: { factoryId, status: { in: ['PENDING', 'SHIPPING'] }, driverId: driver.id },
          data: { driverId: null },
        });
        pending = request.patch('/api/orders/bulk-assign', { data: { orderIds: [order.id], driverId: driver.id } });
        await expect.poll(lockWaiters, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
      },
      { timeout: 30_000 }
    );
    const response = await pending!;

    expect(response.status()).toBe(404);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).driverId).toBeNull();
  });
});
