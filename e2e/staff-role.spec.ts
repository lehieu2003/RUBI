import { expect, test } from '@playwright/test';
import { BASE_URL, PASSWORD, sessionFile } from './support/env';
import { createOrder, db } from './support/db';
import { expectToast, openStaffSettings } from './support/app';

// The manager moves someone between the office and the trucks. The person is
// signed in while it happens: their open session must follow the new role.
test.describe('changing the role of an account', () => {
  test.use({ storageState: sessionFile('manager') });
  const EMAIL = 'taixe2@miendong.vn';
  // The seeded driver's open orders, handed back when the spec is done.
  let openOrderIds: string[] = [];

  const account = () => db.user.findUniqueOrThrow({ where: { email: EMAIL }, include: { driverProfile: true } });

  const changeRole = async (page: import('@playwright/test').Page, role: 'STAFF' | 'DRIVER') => {
    const row = page.locator('tr', { hasText: EMAIL });
    await row.getByRole('button', { name: /^Sửa / }).click();
    await page.locator('#edit-staff-role').selectOption(role);
    await page.getByRole('button', { name: 'LƯU THAY ĐỔI' }).click();
    return row;
  };

  test.afterAll(async () => {
    // Leave the seeded driver as the other specs expect it.
    const user = await db.user.update({ where: { email: EMAIL }, data: { role: 'DRIVER' } });
    await db.driver.updateMany({ where: { userId: user.id }, data: { isActive: true } });
    const driver = await db.driver.findFirstOrThrow({ where: { userId: user.id } });
    await db.order.updateMany({ where: { id: { in: openOrderIds } }, data: { driverId: driver.id } });
  });

  test('driver to staff and back: rights, driver profile, open orders and the open session follow', async ({ page, browser }) => {
    const open = await createOrder({ customerPart: 'Năm Căn', productId: 'prod-bi-20', quantity: 2, status: 'SHIPPING', driverEmail: EMAIL });
    const openOrders = await db.order.findMany({
      where: { driver: { user: { email: EMAIL } }, status: { in: ['PENDING', 'SHIPPING'] } },
      select: { id: true },
    });
    openOrderIds = openOrders.map((order) => order.id).filter((id) => id !== open.id);

    // The driver is signed in on their phone.
    const phone = await browser.newContext({ baseURL: BASE_URL, storageState: undefined, viewport: { width: 390, height: 844 } });
    const driverPage = await phone.newPage();
    await driverPage.goto('/login');
    await driverPage.fill('#email', EMAIL);
    await driverPage.fill('#password', PASSWORD);
    await driverPage.click('button[type=submit]');
    await driverPage.waitForURL((url) => url.pathname === '/driver');
    expect((await driverPage.request.get('/api/orders')).status()).toBe(403);

    // Manager: driver -> staff.
    await openStaffSettings(page);
    const row = await changeRole(page, 'STAFF');
    await expectToast(page, 'Đã cập nhật nhân sự');
    await expectToast(page, `${openOrders.length} đơn chưa giao của tài xế này đã được gỡ gán`);
    await expect(row).toContainText('Nhân viên');

    let user = await account();
    expect(user.role).toBe('STAFF');
    expect(user.driverProfile?.isActive).toBe(false);
    expect(await db.order.count({ where: { id: { in: openOrders.map((order) => order.id) }, driverId: { not: null } } })).toBe(0);
    // No longer offered when assigning orders.
    const drivers = (await (await page.request.get('/api/drivers')).json()).data as Array<{ name: string }>;
    expect(drivers.map((driver) => driver.name)).not.toContain(user.name);

    // The session that was open as a driver has the rights of staff at once,
    expect((await driverPage.request.get('/api/orders')).status()).toBe(200);
    expect((await driverPage.request.get('/api/driver/orders')).status()).toBe(403);
    // and the next page load leaves the driver screen for the office.
    await driverPage.reload();
    await driverPage.waitForURL((url) => url.pathname === '/dashboard');
    await driverPage.goto('/orders');
    await expect(driverPage.getByRole('heading', { name: 'Quản Lý Đơn Hàng' })).toBeVisible();

    // Manager: back to driver.
    await changeRole(page, 'DRIVER');
    await expect(row).toContainText('Tài xế');
    user = await account();
    expect(user.role).toBe('DRIVER');
    expect(user.driverProfile?.isActive).toBe(true);
    expect(await db.driver.count({ where: { userId: user.id } })).toBe(1);

    expect((await driverPage.request.get('/api/orders')).status()).toBe(403);
    await driverPage.reload();
    await driverPage.waitForURL((url) => url.pathname === '/driver');
    await phone.close();
  });

  test('the role offered is staff or driver, never manager', async ({ page }) => {
    await openStaffSettings(page);
    await page.locator('tr', { hasText: EMAIL }).getByRole('button', { name: /^Sửa / }).click();
    await expect(page.locator('#edit-staff-role option')).toHaveText(['Nhân viên', 'Tài xế']);
    const user = await account();
    const response = await page.request.patch(`/api/staff/${user.id}`, { data: { role: 'ADMIN' } });
    expect(response.status()).toBe(400);
    expect((await account()).role).toBe('DRIVER');
  });
});
