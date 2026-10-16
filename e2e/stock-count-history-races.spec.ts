import { expect, test, type Page } from '@playwright/test';
import { sessionFile } from './support/env';
import { db } from './support/db';
import { openPage } from './support/app';

// The stock-count history on /inventory reloads on every filter change. An
// answer for a filter the manager already left must not land on the new one.
test.describe('stock-count history while the filter changes', () => {
  test.use({ storageState: sessionFile('manager') });
  const SLOW = 'prod-bi-5'; // 21 counts: a second page
  const FAST = 'prod-mi-20'; // 1 count

  test.beforeAll(async () => {
    const { id, factoryId } = await db.user.findUniqueOrThrow({ where: { email: 'quanly@rubi.local' } });
    await db.stockCount.deleteMany({ where: { productId: { in: [SLOW, FAST] } } });
    const count = (productId: string) => ({ factoryId: factoryId!, productId, bookQuantity: 10, countedQuantity: 9, countedById: id });
    await db.stockCount.createMany({ data: [...Array.from({ length: 21 }, () => count(SLOW)), count(FAST)] });
  });

  test.afterAll(async () => {
    await db.stockCount.deleteMany({ where: { productId: { in: [SLOW, FAST] } } });
  });

  /** Holds back the history answers whose query matches, by 2 s. */
  async function slowDown(page: Page, match: (query: URLSearchParams) => boolean) {
    await page.route(
      (url) => url.pathname.startsWith('/api/inventory/counts') && match(url.searchParams),
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        await route.continue().catch(() => {});
      },
    );
  }

  /** Waits for the held-back answers, then lets React apply them. */
  async function afterSlowAnswers(page: Page, match: (query: URLSearchParams) => boolean) {
    await page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/inventory/counts' && match(url.searchParams);
    });
    await page.waitForTimeout(500);
  }

  test('a late answer for the previous product does not replace the current one', async ({ page }) => {
    await openPage(page, '/inventory');
    const filter = page.getByLabel('Lọc theo sản phẩm');
    const isSlow = (query: URLSearchParams) => query.get('productId') === SLOW;
    await slowDown(page, isSlow);

    await filter.selectOption(SLOW);
    await filter.selectOption(FAST);
    await expect(page.getByText('1 lần kiểm')).toBeVisible();
    await afterSlowAnswers(page, isSlow);

    await expect(page.getByText('1 lần kiểm')).toBeVisible();
    const rows = await page.locator('table').last().locator('tbody tr').allInnerTexts();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('Đá Mi 20kg');
  });

  test('a "load more" of the previous product is not appended to the current one', async ({ page }) => {
    await openPage(page, '/inventory');
    const filter = page.getByLabel('Lọc theo sản phẩm');
    await filter.selectOption(SLOW);
    await expect(page.getByRole('button', { name: 'Xem thêm (20/21)' })).toBeVisible();
    const isSecondPage = (query: URLSearchParams) => query.get('productId') === SLOW && query.get('page') === '2';
    await slowDown(page, isSecondPage);

    await page.getByRole('button', { name: 'Xem thêm (20/21)' }).click();
    await filter.selectOption(FAST);
    await expect(page.getByText('1 lần kiểm')).toBeVisible();
    await afterSlowAnswers(page, isSecondPage);

    const rows = await page.locator('table').last().locator('tbody tr').allInnerTexts();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('Đá Mi 20kg');
    await expect(page.getByRole('button', { name: /Xem thêm/ })).toHaveCount(0);
  });
});
