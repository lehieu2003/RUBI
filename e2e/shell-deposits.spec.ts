import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { customerNamed, db } from './support/db';
import { expectToast } from './support/app';

test.describe('shell deposits', () => {
  test.use({ storageState: sessionFile('manager') });

  test('a mistyped count is corrected by replacing the totals; a normal entry still adds', async ({ page }) => {
    const customer = await customerNamed('Năm Căn');
    // 100 was typed where 10 was meant.
    await db.customerShellDeposit.upsert({
      where: { customerId: customer.id },
      create: { customerId: customer.id, shellsOut: 100, shellsIn: 0, depositPerShell: 50000 },
      update: { shellsOut: 100, shellsIn: 0 },
    });
    const totals = async () => {
      const deposit = await db.customerShellDeposit.findUniqueOrThrow({ where: { customerId: customer.id } });
      return [deposit.shellsOut, deposit.shellsIn];
    };

    await page.goto('/deposits/shells');
    const row = page.locator('tr', { hasText: customer.name });
    await row.getByRole('button', { name: 'Sửa số' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Tổng vỏ trả ra')).toHaveValue('100');
    await dialog.getByLabel('Tổng vỏ trả ra').fill('');
    await expect(dialog.getByRole('button', { name: 'LƯU SỐ ĐÚNG' })).toBeDisabled();
    await dialog.getByLabel('Tổng vỏ trả ra').fill('10');
    await dialog.getByLabel('Tổng vỏ thu về').fill('4');
    await dialog.getByRole('button', { name: 'LƯU SỐ ĐÚNG' }).click();
    await expectToast(page, `Đã sửa số vỏ của ${customer.name}`);
    expect(await totals()).toEqual([10, 4]);
    await expect(row).toContainText('300.000');

    await page.getByRole('button', { name: 'THÊM GIAO DỊCH VỎ' }).click();
    await page.locator('select').selectOption(customer.id);
    await page.locator('input[type=number]').nth(1).fill('1');
    await page.getByRole('button', { name: 'XÁC NHẬN', exact: true }).click();
    await expectToast(page, 'Đã ghi nhận giao dịch vỏ bao');
    expect(await totals()).toEqual([10, 5]);
  });
});
