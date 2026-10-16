import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { customerNamed } from './support/db';
import { expectToast, openPage } from './support/app';

// Only the manager creates customers (POST /api/customers is ADMIN only).
test.describe('adding a customer', () => {
  test.describe('staff', () => {
    test.use({ storageState: sessionFile('staff') });

    test('does not get the button: the server would refuse', async ({ page }) => {
      await openPage(page, '/customers');
      await expect(page.getByText('Ding Tea').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'THÊM KHÁCH HÀNG' })).toHaveCount(0);
    });
  });

  test.describe('manager', () => {
    test.use({ storageState: sessionFile('manager') });

    test('sees why the server refused, e.g. a code already taken', async ({ page }) => {
      const existing = await customerNamed('Ding Tea');
      await openPage(page, '/customers');
      await page.getByRole('button', { name: 'THÊM KHÁCH HÀNG' }).click();
      const dialog = page.getByRole('dialog', { name: 'Thêm khách hàng' });
      await dialog.getByPlaceholder('KH001').fill(existing.code);
      await dialog.getByPlaceholder('Đại lý Minh Tuấn').fill('Khách trùng mã');
      await dialog.getByRole('button', { name: 'XÁC NHẬN' }).click();
      await expectToast(page, `Mã khách hàng "${existing.code}" đã tồn tại`);
      await expect(dialog).toBeVisible();
    });
  });
});
