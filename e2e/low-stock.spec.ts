import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { createOrder, db, openQuantityOf, setStock } from './support/db';
import { expectToast } from './support/app';

// The manager gives a product an alert level. The alert looks at what can
// still be sold: stock leaves the books only at settlement, so the bags that
// open orders already took are still "on hand".
test.describe.serial('low-stock alert', () => {
  test.use({ storageState: sessionFile('manager') });
  const PRODUCT = 'prod-vien-5';
  let orderId = '';
  // Bags on the books: 30 more than the open orders of the seed already took.
  let books = 0;

  test.afterAll(async () => {
    await db.product.update({ where: { id: PRODUCT }, data: { minStock: null } });
    if (orderId) await db.order.delete({ where: { id: orderId } });
  });

  const stockRow = (page: import('@playwright/test').Page) =>
    page.locator('tbody tr', { hasText: 'Đá Viên' }).filter({ has: page.getByRole('cell', { name: '5 kg', exact: true }) });

  test('the manager sets the alert level on the product', async ({ page }) => {
    books = 30 + (await openQuantityOf(PRODUCT));
    await setStock(PRODUCT, books);
    await page.goto('/config/prices');
    await page.locator('tr', { hasText: 'Đá Viên (5kg)' }).getByRole('button', { name: 'Chỉnh sửa' }).click();
    const editing = page.locator('tr').filter({ has: page.getByLabel('Tên sản phẩm') });
    await editing.getByLabel('Cảnh báo khi tồn còn').fill('20');
    await editing.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expectToast(page, 'Đã cập nhật sản phẩm');
    await expect(page.locator('tr', { hasText: 'Đá Viên (5kg)' })).toContainText('≤ 20 Bao');
    expect((await db.product.findUniqueOrThrow({ where: { id: PRODUCT } })).minStock).toBe(20);

    // 30 left to sell: no alert yet.
    await page.goto('/inventory');
    await expect(stockRow(page).getByRole('cell').nth(3)).toHaveText('30');
    await expect(stockRow(page)).not.toContainText('Sắp hết');
    await expect(page.getByRole('alert').filter({ hasText: 'Sắp hết hàng' })).toHaveCount(0);
  });

  test('an open order takes the product below the level: cold storage and dashboard warn', async ({ page }) => {
    orderId = (await createOrder({ customerPart: 'Minh Tâm', productId: PRODUCT, quantity: 12 })).id;

    await page.goto('/inventory');
    const alert = page.getByRole('alert').filter({ hasText: 'Sắp hết hàng' });
    await expect(alert).toContainText('Đá Viên 5kg: còn bán được 18 Bao (mức cảnh báo 20)');
    // The books have not moved; 18 is what is left to sell.
    await expect(stockRow(page)).toContainText('Sắp hết');
    await expect(stockRow(page).getByRole('cell').nth(2)).toContainText(String(books));
    await expect(stockRow(page).getByRole('cell').nth(3)).toHaveText('18');

    await page.goto('/dashboard');
    await expect(page.getByText('Sắp hết: Đá Viên 5kg (còn 18)').first()).toBeVisible();
  });

  test('staff see the warning on the dashboard too', async ({ browser }) => {
    const context = await browser.newContext({ storageState: sessionFile('staff') });
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page.getByText('Sắp hết: Đá Viên 5kg (còn 18)').first()).toBeVisible();
    await context.close();
  });

  test('a new batch lifts it above the level; an empty level switches the alert off', async ({ page }) => {
    await page.goto('/inventory');
    await page.getByRole('button', { name: 'NHẬP SẢN LƯỢNG MỚI' }).click();
    await page.locator('select').last().selectOption(PRODUCT);
    await page.getByPlaceholder('Ví dụ: 50').fill('10');
    await page.getByRole('button', { name: 'XÁC NHẬN NHẬP KHO' }).click();
    await expectToast(page, 'Đã nhập kho mẻ đá mới');
    await expect(stockRow(page).getByRole('cell').nth(3)).toHaveText('28');
    await expect(page.getByRole('alert').filter({ hasText: 'Sắp hết hàng' })).toHaveCount(0);

    // Back below (level 40), then no level at all.
    await db.product.update({ where: { id: PRODUCT }, data: { minStock: 40 } });
    await page.goto('/config/prices');
    // While the page streams in, the browser briefly holds a hidden copy of the table.
    const row = page.locator('tr:visible', { hasText: 'Đá Viên (5kg)' });
    await expect(row).toContainText('≤ 40 Bao');
    await row.getByRole('button', { name: 'Chỉnh sửa' }).click();
    const editing = page.locator('tr').filter({ has: page.getByLabel('Tên sản phẩm') });
    await editing.getByLabel('Cảnh báo khi tồn còn').fill('');
    await editing.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expectToast(page, 'Đã cập nhật sản phẩm');
    expect((await db.product.findUniqueOrThrow({ where: { id: PRODUCT } })).minStock).toBeNull();
    await page.goto('/inventory');
    await expect(stockRow(page)).not.toContainText('Sắp hết');
  });
});
