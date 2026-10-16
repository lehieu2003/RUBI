import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { createOrder, db, orderCode, setStock, stockOf, vietnamDayStart } from './support/db';
import { expectToast, openOrderDrawerFor } from './support/app';

// One order, from the phone call to settlement, across the three roles.
test.describe.serial('an order from the phone call to settlement', () => {
  const CUSTOMER = 'Đại Lý Nước Ngọt Minh Tâm';
  const PRODUCT = 'prod-bi-5'; // the first cell of the order grid
  let orderId = '';
  let total = 0;

  test.describe('staff', () => {
    test.use({ storageState: sessionFile('staff') });

    test('take the order with the keyboard; the server prices it from the price list', async ({ page }) => {
      await page.goto('/orders');
      const before = await db.order.count();
      const customer = await db.customer.findFirstOrThrow({ where: { name: CUSTOMER } });
      const override = await db.customerPriceOverride.findFirst({ where: { customerId: customer.id, productId: PRODUCT } });
      const listed = await db.globalPrice.findUniqueOrThrow({ where: { productId: PRODUCT } });
      const price = Number((override ?? listed).pricePerUnit);

      const drawer = await openOrderDrawerFor(page, 'Minh Tâm');
      // After choosing the customer the cursor sits in the first quantity.
      await expect(drawer.locator('input[type=number]').first()).toBeFocused();
      await page.keyboard.type('3');
      await expect(drawer.getByText(`${(3 * price).toLocaleString('vi-VN')}đ`).last()).toBeVisible();
      await page.keyboard.press('Enter');
      await expectToast(page, 'Đã lên đơn thành công');

      expect(await db.order.count()).toBe(before + 1);
      const order = await db.order.findFirstOrThrow({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        include: { orderItems: true },
      });
      orderId = order.id;
      total = Number(order.total);
      expect(order.status).toBe('PENDING');
      expect(order.orderItems).toHaveLength(1);
      expect(order.orderItems[0].productId).toBe(PRODUCT);
      expect(Number(order.orderItems[0].unitPrice)).toBe(price);
      expect(total).toBe(3 * price);
      // The new order shows up without a reload.
      await expect(page.locator('tr', { hasText: orderCode(orderId) })).toBeVisible();
    });

    test('assign it to a driver and send it out', async ({ page }) => {
      await page.goto('/orders');
      const row = page.locator('tr', { hasText: orderCode(orderId) });
      await row.locator('td').first().getByRole('button').click();
      await page.locator('select', { hasText: '-- Chọn tài xế --' }).selectOption({ label: 'Phạm Văn Tài' });
      await page.getByRole('button', { name: 'Giao đơn đã chọn' }).click();
      await expectToast(page, 'Đã giao đơn cho tài xế');
      await expect(row).toContainText('Phạm Văn Tài');

      await row.getByRole('button', { name: /Xem/ }).click();
      await page.locator('select').filter({ has: page.locator('option[value=SHIPPING]') }).last().selectOption('SHIPPING');
      await expectToast(page, 'Đã cập nhật trạng thái đơn hàng');

      const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { driver: true } });
      expect(order.status).toBe('SHIPPING');
      expect(order.driver?.name).toBe('Phạm Văn Tài');
    });
  });

  test.describe('driver, on a phone', () => {
    test.use({ storageState: sessionFile('driver'), viewport: { width: 390, height: 844 } });

    test('still sees an order taken the evening before, and confirms the delivery', async ({ page }) => {
      // The order was phoned in at 22:00 yesterday.
      await db.order.update({ where: { id: orderId }, data: { createdAt: new Date(vietnamDayStart().getTime() - 2 * 60 * 60 * 1000) } });

      await page.goto('/driver');
      const card = page
        .locator('div', { hasText: CUSTOMER })
        .filter({ hasText: total.toLocaleString('vi-VN') })
        .filter({ has: page.getByRole('button', { name: 'XÁC NHẬN ĐÃ GIAO XONG' }) })
        .last();
      await expect(card).toBeVisible();
      await card.getByRole('button', { name: 'XÁC NHẬN ĐÃ GIAO XONG' }).click();

      await expect.poll(async () => (await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('DELIVERED');
      expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).deliveredAt).not.toBeNull();

      // After a reload it is still listed, as delivered.
      await page.reload();
      const delivered = page
        .locator('div', { hasText: CUSTOMER })
        .filter({ hasText: total.toLocaleString('vi-VN') })
        .filter({ hasText: 'ĐÃ HOÀN TẤT GIAO HÀNG' })
        .last();
      await expect(delivered).toBeVisible();
      await expect(delivered.getByRole('button', { name: 'XÁC NHẬN ĐÃ GIAO XONG' })).toHaveCount(0);
    });
  });

  test.describe('manager', () => {
    test.use({ storageState: sessionFile('manager') });

    test('settles it the next morning: counter, debt and stock all move once', async ({ page }) => {
      const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
      // 100 on the books at the close of yesterday; nothing recorded today.
      await setStock(PRODUCT, 100, 1);
      const debtOf = async () =>
        Number((await db.customerDebtLedger.aggregate({ where: { customerId: order.customerId, type: 'DEBT' }, _sum: { amount: true } }))._sum.amount ?? 0);
      const debtBefore = await debtOf();

      await page.goto('/settle');
      const counter = page.locator('div', { hasText: /^Đã đối soát hôm nay\d+$/ }).last();
      await expect(counter).toBeVisible();
      const settledBefore = Number((await counter.innerText()).replace(/\D/g, ''));

      const card = page.locator('div.rounded.border', { hasText: orderCode(orderId) });
      await card.getByRole('button', { name: 'CHỐT ĐƠN', exact: true }).click();
      await page.getByRole('button', { name: 'XÁC NHẬN CHỐT' }).click();
      await expectToast(page, 'Đã chốt đơn thành công');

      await expect(page.getByText(orderCode(orderId))).toHaveCount(0);
      await expect(counter).toHaveText(new RegExp(`${settledBefore + 1}$`));
      // The counter is read from the server, so it survives a reload.
      await page.reload();
      await expect(page.locator('div', { hasText: /^Đã đối soát hôm nay\d+$/ }).last()).toHaveText(new RegExp(`${settledBefore + 1}$`));

      const settled = await db.order.findUniqueOrThrow({ where: { id: orderId } });
      expect(settled.status).toBe('COMPLETED');
      expect(settled.completedAt).not.toBeNull();
      expect(await debtOf()).toBe(debtBefore + total);
      // Yesterday's closing stock carried over, minus the three bags delivered.
      expect(await stockOf(PRODUCT)).toBe(97);
      expect(await db.inventory.count({ where: { productId: PRODUCT } })).toBe(2);
    });
  });

  test.describe('once settled', () => {
    test.use({ storageState: sessionFile('driver') });

    test('the driver cannot reopen it', async ({ page }) => {
      const response = await page.request.patch(`/api/orders/${orderId}/confirm`);
      expect(response.status()).toBe(409);
      expect((await response.json()).code).toBe('ORDER_NOT_SHIPPING');
      expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('COMPLETED');
    });
  });
});

// The cancel-reason dialog sits on top of the order drawer. Esc must close the
// dialog only: closing the drawer under it left a "Xác nhận hủy" that did nothing.
test.describe('cancelling from the order drawer', () => {
  test.use({ storageState: sessionFile('staff') });

  test('Esc in the reason dialog closes it, and the order can still be cancelled', async ({ page }) => {
    const order = await createOrder({ customerPart: 'Minh Tâm', productId: 'prod-bi-5', quantity: 1 });

    await page.goto('/orders');
    await page.locator('tr', { hasText: orderCode(order.id) }).getByRole('button', { name: /Xem/ }).click();
    const drawer = page.getByRole('dialog', { name: /Chi tiết đơn hàng/ });
    const status = drawer.locator('select');
    const reasonTitle = page.getByRole('heading', { name: 'Lý do hủy đơn hàng' });
    const reason = page.getByPlaceholder(/Khách gọi báo dời ngày/);

    await status.selectOption('CANCELLED');
    await expect(reasonTitle).toBeVisible();
    await reason.fill('Khách đổi ý');
    await page.keyboard.press('Escape');
    await expect(reasonTitle).toBeHidden();
    await expect(drawer).toBeVisible();
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PENDING');

    // Opened again, it starts empty and cancelling goes through.
    await status.selectOption('CANCELLED');
    await expect(reason).toHaveValue('');
    await reason.fill('Khách gọi hủy');
    await page.getByRole('button', { name: 'Xác nhận hủy' }).click();
    await expectToast(page, 'Đã cập nhật trạng thái đơn hàng');
    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.status).toBe('CANCELLED');
    expect(after.notes).toContain('[HỦY: Khách gọi hủy]');
  });

  test('cancelling keeps the note of the order and adds the reason after it', async ({ page }) => {
    const order = await createOrder({ customerPart: 'Minh Tâm', productId: 'prod-bi-5', quantity: 1 });
    await db.order.update({ where: { id: order.id }, data: { notes: 'Giao cổng sau' } });

    const response = await page.request.patch(`/api/orders/${order.id}/status`, {
      data: { status: 'CANCELLED', cancellationReason: 'Khách gọi hủy' },
    });
    expect(response.status()).toBe(200);
    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.notes).toBe('Giao cổng sau\n[HỦY: Khách gọi hủy]');
  });
});
