import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { createOrder, db } from './support/db';
import { expectToast, openStaffSettings } from './support/app';

test.describe.serial('staff accounts', () => {
  test.use({ storageState: sessionFile('manager') });
  const stamp = Date.now().toString(36);
  const EMAIL = `taixe-${stamp}@rubi.local`;
  const NAME = `Tài Xế ${stamp}`;
  // A number nobody else holds: the last digits vary per run.
  const PHONE = `09${String(Date.now()).slice(-8)}`;

  const phones = async () => {
    const user = await db.user.findUniqueOrThrow({ where: { email: EMAIL }, include: { driverProfile: true } });
    return [user.phone, user.driverProfile?.phone ?? null];
  };

  test('creating a driver closes the dialog and lists the account with its phone', async ({ page }) => {
    await openStaffSettings(page);
    await page.getByRole('button', { name: 'THÊM NHÂN SỰ' }).click();
    await page.getByPlaceholder('VD: Nguyễn Văn A').fill(NAME);
    await page.getByPlaceholder('VD: nv-a@email.com').fill(EMAIL);
    await page.getByPlaceholder('VD: 0909123456').fill(PHONE);
    await page.locator('input[type=password]').last().fill('Matkhau2026x');
    await page.locator('select').last().selectOption('DRIVER');
    await page.getByRole('button', { name: 'TẠO NHÂN SỰ MỚI' }).click();

    await expectToast(page, 'Đã tạo nhân sự thành công');
    await expect(page.getByText('Thêm nhân sự mới')).toHaveCount(0);
    await expect(page.locator('tr', { hasText: EMAIL })).toContainText(PHONE);
    expect(await phones()).toEqual([PHONE, PHONE]);
  });

  test('refuses a phone that is not a number, and one another driver holds', async ({ page }) => {
    // A driver without an account, as older data has: its userId is null.
    const factory = await db.factory.findFirstOrThrow();
    const taken = `08${String(Date.now()).slice(-8)}`;
    await db.driver.create({ data: { name: `Tài xế cũ ${stamp}`, phone: taken, factoryId: factory.id } });

    await openStaffSettings(page);
    await page.locator('tr', { hasText: EMAIL }).getByRole('button', { name: /^Sửa / }).click();
    await page.locator('#edit-staff-phone').fill('số của tôi');
    await page.getByRole('button', { name: 'LƯU THAY ĐỔI' }).click();
    await expectToast(page, 'Số điện thoại không hợp lệ');

    await page.locator('#edit-staff-phone').fill(taken);
    await page.getByRole('button', { name: 'LƯU THAY ĐỔI' }).click();
    await expectToast(page, 'Số điện thoại này đã được dùng cho một tài xế khác');
    expect(await phones()).toEqual([PHONE, PHONE]);
  });

  test('a rename keeps the phone; clearing the phone empties account and driver profile', async ({ page }) => {
    await openStaffSettings(page);
    const row = page.locator('tr', { hasText: EMAIL });
    await row.getByRole('button', { name: /^Sửa / }).click();
    await expect(page.locator('#edit-staff-phone')).toHaveValue(PHONE);
    await page.locator('#edit-staff-name').fill(`${NAME} A`);
    await page.getByRole('button', { name: 'LƯU THAY ĐỔI' }).click();
    await expectToast(page, 'Đã cập nhật nhân sự');
    await expect(row).toContainText(`${NAME} A`);
    expect(await phones()).toEqual([PHONE, PHONE]);
    expect((await db.driver.findFirstOrThrow({ where: { user: { email: EMAIL } } })).name).toBe(`${NAME} A`);

    await row.getByRole('button', { name: /^Sửa / }).click();
    await page.locator('#edit-staff-phone').fill('');
    await page.getByRole('button', { name: 'LƯU THAY ĐỔI' }).click();
    await expect.poll(phones).toEqual([null, null]);
  });

  test("locking a driver keeps a profile-only phone and frees the driver's open orders", async ({ page }) => {
    // The phone lives on the driver profile only, as on data older than account phones.
    await db.user.update({ where: { email: EMAIL }, data: { phone: null } });
    await db.driver.updateMany({ where: { user: { email: EMAIL } }, data: { phone: PHONE } });
    const open = await createOrder({ customerPart: 'Năm Căn', productId: 'prod-bi-20', quantity: 2, status: 'SHIPPING', driverEmail: EMAIL });
    const done = await createOrder({ customerPart: 'Năm Căn', productId: 'prod-bi-20', quantity: 1, status: 'DELIVERED', driverEmail: EMAIL });

    await openStaffSettings(page);
    const row = page.locator('tr', { hasText: EMAIL });
    await expect(row).toContainText(PHONE);
    await row.getByRole('button', { name: 'Khóa', exact: true }).click();
    await expectToast(page, '1 đơn chưa giao của tài xế này đã được gỡ gán');

    const unassigned = await db.order.findUniqueOrThrow({ where: { id: open.id } });
    expect([unassigned.driverId, unassigned.status]).toEqual([null, 'SHIPPING']);
    // A delivered order keeps the driver for the record.
    expect((await db.order.findUniqueOrThrow({ where: { id: done.id } })).driverId).not.toBeNull();
    expect(await phones()).toEqual([null, PHONE]);

    await row.getByRole('button', { name: 'Mở khóa' }).click();
    await expectToast(page, 'Đã mở khóa nhân sự');
    const driver = await db.driver.findFirstOrThrow({ where: { user: { email: EMAIL } } });
    expect([driver.isActive, driver.phone]).toEqual([true, PHONE]);
  });
});
