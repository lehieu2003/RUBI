import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { db, openQuantityOf, setStock } from './support/db';
import { gridCell, openOrderDrawerFor } from './support/app';

test.describe('order drawer', () => {
  test.use({ storageState: sessionFile('staff') });

  test('lists every product on sale, not a fixed set', async ({ page }) => {
    await page.goto('/orders');
    const drawer = await openOrderDrawerFor(page, 'Minh Tâm');
    const onSale = await db.product.findMany({ where: { isActive: true } });
    await expect(drawer.locator('input[type=number]')).toHaveCount(onSale.length);
    for (const name of new Set(onSale.map((product) => product.name))) {
      await expect(drawer.locator('tbody tr', { hasText: name })).toHaveCount(1);
    }
  });

  test('shows what is left to sell: book stock minus unsettled orders', async ({ page }) => {
    await setStock('prod-vien-10', 12);
    await db.inventory.deleteMany({ where: { productId: 'prod-mi-20' } });
    const left = 12 - (await openQuantityOf('prod-vien-10'));
    const ordersBefore = await db.order.count();

    await page.goto('/orders');
    const drawer = await openOrderDrawerFor(page, 'Minh Tâm');
    const cell = await gridCell(drawer, 'Đá Viên', 10);
    const figure = cell.getByText(/^Còn /);
    await expect(figure).toHaveText(`Còn ${left.toLocaleString('vi-VN')}`);

    // A product that never had a stock record shows no figure at all.
    await expect((await gridCell(drawer, 'Đá Mi', 20)).getByText(/^Còn /)).toHaveCount(0);

    // Asking for more than is left marks the figure; it is a hint, not a block.
    if (left > 0) await expect(figure).not.toHaveClass(/text-error/);
    await cell.locator('input').fill(String(Math.max(left, 0) + 1));
    await expect(figure).toHaveClass(/text-error/);
    await expect(drawer.getByRole('button', { name: /XÁC NHẬN TẠO ĐƠN/ })).toBeEnabled();

    await page.keyboard.press('Escape');
    expect(await db.order.count()).toBe(ordersBefore);
  });
});
