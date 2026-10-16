import { expect, test, type Page } from '@playwright/test';
import { sessionFile } from './support/env';
import { db, setStock, stockOf } from './support/db';
import { expectToast, openPage } from './support/app';

/** The stock row of Đá Viên 20 kg, by its size cell: a total such as "1.220 kg" also contains "20 kg". */
const stockRow = (page: Page) =>
  page.locator('tbody tr', { hasText: 'Đá Viên' }).filter({ has: page.locator('td', { hasText: /^20 kg$/ }) });

test.describe.serial('cold storage', () => {
  test.use({ storageState: sessionFile('manager') });
  const PRODUCT = 'prod-vien-20';

  test("opens the day with yesterday's closing stock and adds production on top", async ({ page }) => {
    await setStock(PRODUCT, 150, 1); // nothing recorded today
    await openPage(page, '/inventory');
    const row = stockRow(page);
    await expect(row).toContainText('150');

    await page.getByRole('button', { name: 'NHẬP SẢN LƯỢNG MỚI' }).click();
    await page.locator('select').last().selectOption(PRODUCT);
    await page.getByPlaceholder('Ví dụ: 50').fill('40');
    await page.getByRole('button', { name: 'XÁC NHẬN NHẬP KHO' }).click();
    await expectToast(page, 'Đã nhập kho mẻ đá mới');

    await expect(row).toContainText('190');
    expect(await stockOf(PRODUCT)).toBe(190);
    // Yesterday's row stays as that day's closing balance.
    const rows = await db.inventory.findMany({ where: { productId: PRODUCT }, orderBy: { date: 'asc' } });
    expect(rows.map((item) => item.quantityOnHand)).toEqual([150, 190]);
  });

  test('a stock count replaces the balance and is kept with its note', async ({ page }) => {
    await openPage(page, '/inventory');
    const row = stockRow(page);
    await row.getByRole('button', { name: 'Kiểm kho' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('190');
    await dialog.locator('input[type=number]').fill('182');
    await expect(dialog).toContainText('-8');
    await dialog.getByPlaceholder(/tan chảy/).fill('Vỡ bao khi xếp kho');
    await dialog.getByRole('button', { name: 'XÁC NHẬN KIỂM KHO' }).click();
    await expectToast(page, /hao hụt 8/);

    await expect(row).toContainText('182');
    expect(await stockOf(PRODUCT)).toBe(182);
    const count = await db.stockCount.findFirstOrThrow({ where: { productId: PRODUCT }, orderBy: { createdAt: 'desc' }, include: { countedBy: true } });
    expect([count.bookQuantity, count.countedQuantity, count.note]).toEqual([190, 182, 'Vỡ bao khi xếp kho']);
    expect(count.countedBy?.email).toBe('quanly@rubi.local');

    const newest = page.locator('table').last().locator('tbody tr').first();
    for (const part of ['Đá Viên 20kg', '190', '182', '-8', 'Vỡ bao khi xếp kho']) {
      await expect(newest).toContainText(part);
    }
  });

  test('the history filters by product and totals the loss', async ({ page }) => {
    const counts = await db.stockCount.findMany({ where: { productId: PRODUCT } });
    const loss = counts.reduce((sum, count) => sum + Math.max(0, count.bookQuantity - count.countedQuantity), 0);

    await openPage(page, '/inventory');
    await page.getByLabel('Lọc theo sản phẩm').selectOption(PRODUCT);
    await expect(page.getByText(`${counts.length} lần kiểm`)).toBeVisible();
    await expect(page.getByText(`Hao hụt: ${loss.toLocaleString('vi-VN')}`)).toBeVisible();
    const history = page.locator('table').last().locator('tbody tr');
    await expect(history).toHaveCount(Math.min(counts.length, 20));
    for (const text of await history.allInnerTexts()) expect(text).toContain('Đá Viên 20kg');

    // A product that was never counted: nothing listed, totals at zero.
    await db.stockCount.deleteMany({ where: { productId: 'prod-cay-50' } });
    await page.getByLabel('Lọc theo sản phẩm').selectOption('prod-cay-50');
    await expect(page.getByText('Không có lần kiểm kho nào khớp bộ lọc')).toBeVisible();
    await expect(page.getByText('Hao hụt: 0')).toBeVisible();
  });
});
