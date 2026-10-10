import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { db, setStock } from './support/db';
import { expectToast, gridCell, openOrderDrawerFor } from './support/app';

test.describe.serial('product catalogue', () => {
  const NAME = `Đá Thử ${Date.now().toString(36)}`;

  test.describe('manager', () => {
    test.use({ storageState: sessionFile('manager') });

    test('adds a product with its price from the menu entry', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByRole('link', { name: 'Sản phẩm & giá' }).click();
      await expect(page.getByRole('heading', { name: 'Sản Phẩm & Bảng Giá Cơ Bản' })).toBeVisible();

      await page.getByRole('button', { name: 'THÊM SẢN PHẨM' }).click();
      await page.getByPlaceholder('Đá Bi').fill(NAME);
      await page.getByPlaceholder('10', { exact: true }).fill('15');
      await page.getByPlaceholder('22000').fill('31000');
      await page.getByRole('button', { name: 'Lưu sản phẩm' }).click();
      await expectToast(page, `Đã thêm ${NAME} 15kg`);
      await expect(page.locator('tr', { hasText: `${NAME} (15kg)` })).toContainText('31.000');

      const product = await db.product.findFirstOrThrow({ where: { name: NAME }, include: { globalPrices: true } });
      expect(product.unit).toBe('Bao');
      expect(Number(product.globalPrices?.pricePerUnit)).toBe(31000);
    });

    test('refuses the same name and size in another letter case', async ({ page }) => {
      await page.goto('/config/prices');
      await page.getByRole('button', { name: 'THÊM SẢN PHẨM' }).click();
      await page.getByPlaceholder('Đá Bi').fill(NAME.toLowerCase());
      await page.getByPlaceholder('10', { exact: true }).fill('15');
      await page.getByPlaceholder('22000').fill('1');
      await page.getByRole('button', { name: 'Lưu sản phẩm' }).click();
      await expectToast(page, /Đã có sản phẩm/);
      expect(await db.product.count({ where: { name: { equals: NAME, mode: 'insensitive' } } })).toBe(1);
    });
  });

  test.describe('staff', () => {
    test.use({ storageState: sessionFile('staff') });

    test('can order the new product straight away', async ({ page }) => {
      await page.goto('/orders');
      const drawer = await openOrderDrawerFor(page, 'Minh Tâm');
      const cell = await gridCell(drawer, NAME, 15);
      await expect(cell).toContainText('31.000đ');
      await cell.locator('input').fill('2');
      await drawer.getByRole('button', { name: /XÁC NHẬN TẠO ĐƠN/ }).click();
      await expectToast(page, 'Đã lên đơn thành công');

      const item = await db.orderItem.findFirstOrThrow({ where: { product: { name: NAME } } });
      expect(item.quantity).toBe(2);
      expect(Number(item.unitPrice)).toBe(31000);
    });
  });

  test.describe('manager, later', () => {
    test.use({ storageState: sessionFile('manager') });

    test('edits unit and price; the size is locked and the old order keeps its price', async ({ page }) => {
      await page.goto('/config/prices');
      await page.locator('tr', { hasText: `${NAME} (15kg)` }).getByRole('button', { name: 'Chỉnh sửa' }).click();
      const editing = page.locator('tr').filter({ has: page.getByLabel('Tên sản phẩm') });
      await expect(editing.getByLabel('Cỡ (kg)')).toBeDisabled();
      await editing.getByLabel('Đơn vị').fill('Túi');
      await editing.getByLabel('Giá cơ bản').fill('32000');
      await editing.getByRole('button', { name: 'Lưu', exact: true }).click();
      await expectToast(page, 'Đã cập nhật sản phẩm');

      const product = await db.product.findFirstOrThrow({ where: { name: NAME }, include: { globalPrices: true, orderItems: true } });
      expect(product.unit).toBe('Túi');
      expect(Number(product.globalPrices?.pricePerUnit)).toBe(32000);
      expect(Number(product.orderItems[0].unitPrice)).toBe(31000);
    });

    test('is asked before discontinuing a product that still has stock or open orders', async ({ page }) => {
      const product = await db.product.findFirstOrThrow({ where: { name: NAME } });
      await setStock(product.id, 40);
      await page.goto('/config/prices');
      const row = page.locator('tr', { hasText: `${NAME} (15kg)` });

      await row.getByRole('button', { name: 'Ngừng bán' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('Kho còn 40 Túi');
      await expect(dialog).toContainText('Đang nằm trong 1 đơn chưa đối soát');
      await dialog.getByRole('button', { name: 'HỦY' }).click();
      expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).isActive).toBe(true);

      await row.getByRole('button', { name: 'Ngừng bán' }).click();
      await page.getByRole('button', { name: 'VẪN NGỪNG BÁN' }).click();
      await expectToast(page, `Đã ngừng bán ${NAME} 15kg`);
      expect((await db.product.findUniqueOrThrow({ where: { id: product.id } })).isActive).toBe(false);
      // It stays listed, so it can be sold again.
      await expect(row.getByRole('button', { name: 'Bán lại' })).toBeVisible();
    });

    test('a discontinued product leaves the order drawer but stays on past orders', async ({ page }) => {
      await page.goto('/orders');
      await expect(page.locator('table').first()).toContainText(NAME);
      const drawer = await openOrderDrawerFor(page, 'Minh Tâm');
      await expect(drawer.locator('tbody tr', { hasText: NAME })).toHaveCount(0);
    });
  });
});
