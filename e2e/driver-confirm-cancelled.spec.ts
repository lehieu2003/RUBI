import { expect, test } from '@playwright/test';
import { ACCOUNTS, sessionFile } from './support/env';
import { createOrder, db } from './support/db';
import { expectToast, openPage } from './support/app';

// The office cancels an order while the driver still has it on the phone. The
// confirm is refused (409): the list must show what the server has, not put the
// order back as still to deliver.
test.describe('driver confirms an order the office just cancelled', () => {
  test.use({ storageState: sessionFile('driver'), viewport: { width: 390, height: 844 } });
  const CUSTOMER = 'Năm Căn';
  let orderId = '';

  test.afterAll(async () => {
    if (!orderId) return;
    await db.orderItem.deleteMany({ where: { orderId } });
    await db.order.delete({ where: { id: orderId } }).catch(() => {});
  });

  test('shows the server refusal and drops the order from the list', async ({ page }) => {
    const order = await createOrder({ customerPart: CUSTOMER, productId: 'prod-bi-20', quantity: 37, status: 'SHIPPING', driverEmail: ACCOUNTS.driver });
    orderId = order.id;
    const total = Number(order.total).toLocaleString('vi-VN');

    await openPage(page, '/driver');
    const card = page
      .locator('div', { hasText: CUSTOMER })
      .filter({ hasText: total })
      .filter({ has: page.getByRole('button', { name: 'XÁC NHẬN ĐÃ GIAO XONG' }) })
      .last();
    await expect(card).toBeVisible();

    await db.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
    await card.getByRole('button', { name: 'XÁC NHẬN ĐÃ GIAO XONG' }).click();

    await expectToast(page, 'Chỉ xác nhận được đơn đang giao');
    await expect(page.locator('div', { hasText: CUSTOMER }).filter({ hasText: total })).toHaveCount(0);
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('CANCELLED');
  });
});
