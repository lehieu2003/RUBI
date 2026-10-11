import { expect, test, type Browser } from '@playwright/test';
import { ACCOUNTS, type Role, sessionFile } from './support/env';
import { createOrder, db, orderCode } from './support/db';
import { expectToast, openOrderDrawerFor } from './support/app';

// Every change to an order and to a customer's debt leaves a line saying who
// did it. One order goes from the phone call to settlement, a payment is
// recorded, another order is cancelled; then the manager reads the log.
test.describe.serial('audit log of orders and debt', () => {
  const CUSTOMER = 'Cà Phê Sân Vườn Hướng Dương';
  let orderId = '';
  let cancelledId = '';
  let unitPrice = 0;
  const nameOf = async (role: Role) => (await db.user.findUniqueOrThrow({ where: { email: ACCOUNTS[role] } })).name;

  /** API calls with the session of one role. */
  const as = async (browser: Browser, role: Role) => (await browser.newContext({ storageState: sessionFile(role) })).request;

  test('staff take, assign and send out an order; the driver delivers; the manager settles one bag short and records a payment', async ({ browser }) => {
    const staffContext = await browser.newContext({ storageState: sessionFile('staff') });
    const staffPage = await staffContext.newPage();
    await staffPage.goto('/orders');
    await openOrderDrawerFor(staffPage, 'Hướng Dương');
    await staffPage.keyboard.type('2');
    await staffPage.keyboard.press('Enter');
    await expectToast(staffPage, 'Đã lên đơn thành công');
    const customer = await db.customer.findFirstOrThrow({ where: { name: CUSTOMER } });
    const order = await db.order.findFirstOrThrow({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: { orderItems: true },
    });
    orderId = order.id;
    unitPrice = Number(order.orderItems[0].unitPrice);

    const driver = await db.driver.findFirstOrThrow({ where: { user: { email: ACCOUNTS.driver } } });
    const staff = staffContext.request;
    expect((await staff.patch('/api/orders/bulk-assign', { data: { orderIds: [orderId], driverId: driver.id } })).status()).toBe(200);
    expect((await staff.patch(`/api/orders/${orderId}/status`, { data: { status: 'SHIPPING' } })).status()).toBe(200);
    expect((await (await as(browser, 'driver')).patch(`/api/orders/${orderId}/confirm`)).status()).toBe(200);

    const manager = await as(browser, 'manager');
    const settled = await manager.patch(`/api/orders/${orderId}/reconcile`, {
      data: { items: [{ id: order.orderItems[0].id, actualQty: 1 }] },
    });
    expect(settled.status()).toBe(200);
    const paid = await manager.post(`/api/customers/${customer.id}/payments`, { data: { amount: 5000, notes: 'tiền mặt' } });
    expect(paid.status()).toBe(201);

    // Another order, cancelled by staff with a reason.
    cancelledId = (await createOrder({ customerPart: 'Hướng Dương', productId: 'prod-bi-5', quantity: 1 })).id;
    const cancel = await staff.patch(`/api/orders/${cancelledId}/status`, { data: { status: 'CANCELLED', cancellationReason: 'Khách dời ngày' } });
    expect(cancel.status()).toBe(200);
    await staffContext.close();
  });

  test.describe('manager', () => {
    test.use({ storageState: sessionFile('manager') });

    test('reads the whole trail of the order, newest first, with who did each step', async ({ page }) => {
      const [staffName, driverName, managerName] = await Promise.all([nameOf('staff'), nameOf('driver'), nameOf('manager')]);
      await page.goto('/dashboard');
      await page.getByRole('link', { name: 'Nhật ký' }).click();
      await expect(page.getByRole('heading', { name: 'Nhật Ký Đơn Hàng & Công Nợ' })).toBeVisible();

      const rows = page.locator('tbody tr', { hasText: orderCode(orderId) });
      await expect(rows).toHaveCount(5);
      const debt = unitPrice.toLocaleString('vi-VN');
      await expect(rows.nth(0)).toContainText(`${managerName}Chốt đơn`);
      await expect(rows.nth(0)).toContainText(`Chốt đơn: Đá Bi 5kg đặt 2, thực giao 1. Ghi nợ ${debt}đ`);
      await expect(rows.nth(1)).toContainText(`${driverName}Đã giao`);
      await expect(rows.nth(2)).toContainText(`${staffName}Đổi trạng thái`);
      await expect(rows.nth(2)).toContainText('Chờ giao → Đang giao');
      await expect(rows.nth(3)).toContainText(`Giao cho tài xế ${driverName}`);
      await expect(rows.nth(4)).toContainText(`${staffName}Lên đơn`);
      await expect(rows.nth(4)).toContainText(`Lên đơn: Đá Bi 5kg × 2. Tổng ${(2 * unitPrice).toLocaleString('vi-VN')}đ`);
      for (const index of [0, 1, 2, 3, 4]) await expect(rows.nth(index)).toContainText(CUSTOMER);

      await expect(page.locator('tbody tr', { hasText: orderCode(cancelledId) })).toContainText('Hủy đơn (đang Chờ giao). Lý do: Khách dời ngày');
      // The order code opens the order.
      await rows.nth(0).getByRole('link', { name: orderCode(orderId) }).click();
      await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));
    });

    test('the debt filter keeps settlements and payments; the order filter drops payments', async ({ page }) => {
      await page.goto('/audit-log');
      const payment = page.locator('tbody tr', { hasText: 'Thu tiền 5.000đ (tiền mặt). Còn nợ' });
      await expect(payment.first()).toContainText(CUSTOMER);

      await page.getByRole('button', { name: 'Công nợ' }).click();
      await expect(page.locator('tbody tr', { hasText: orderCode(orderId) })).toHaveCount(1);
      await expect(payment.first()).toBeVisible();
      await expect(page.locator('tbody tr', { hasText: 'Lên đơn' })).toHaveCount(0);

      await page.getByRole('button', { name: 'Đơn hàng' }).click();
      await expect(page.locator('tbody tr', { hasText: orderCode(orderId) })).toHaveCount(5);
      await expect(payment).toHaveCount(0);
    });

    test('what the log says matches what was stored', async () => {
      const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { orderItems: true } });
      expect(order.status).toBe('COMPLETED');
      expect(order.orderItems[0].actualQty).toBe(1);
      const entries = await db.auditLog.findMany({ where: { orderId }, orderBy: { createdAt: 'asc' } });
      expect(entries.map((entry) => entry.action)).toEqual(['ORDER_CREATED', 'ORDER_ASSIGNED', 'ORDER_STATUS_CHANGED', 'ORDER_DELIVERED', 'ORDER_SETTLED']);
      expect(new Set(entries.map((entry) => entry.customerId))).toEqual(new Set([order.customerId]));
    });
  });

  test.describe('staff', () => {
    test.use({ storageState: sessionFile('staff') });

    test('have no log: not in the menu, not by its address, not through the API', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page.getByRole('link', { name: 'Nhật ký' })).toHaveCount(0);
      await page.goto('/audit-log');
      await expect(page).toHaveURL((url) => url.pathname === '/dashboard');
      expect((await page.request.get('/api/audit-logs')).status()).toBe(403);
    });
  });
});
