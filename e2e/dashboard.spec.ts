import { expect, test, type Page } from '@playwright/test';
import { sessionFile } from './support/env';
import { createOrder, customerNamed, db, vietnamDayStart } from './support/db';
import { expectToast, gridCell, openOrderDrawerFor } from './support/app';

/** What the factory sold between two instants: every order but the cancelled ones. */
async function revenueBetween(from: Date, to?: Date): Promise<number> {
  const sum = await db.order.aggregate({
    where: { createdAt: { gte: from, ...(to ? { lt: to } : {}) }, status: { not: 'CANCELLED' } },
    _sum: { total: true },
  });
  return Number(sum._sum.total ?? 0);
}

/** The line under the revenue figure, as the dashboard words it. */
function trendText(today: number, yesterday: number): string {
  if (yesterday > 0) {
    const diff = today - yesterday;
    const percent = Math.round((Math.abs(diff) / yesterday) * 100);
    if (diff > 0) return `+${percent}% so với hôm qua`;
    if (diff < 0) return `-${percent}% so với hôm qua`;
    return 'Bằng hôm qua';
  }
  return today > 0 ? 'Tăng trưởng hôm nay' : 'Chưa có đơn';
}

/** The "Doanh số hôm nay" card: its title, figure and trend line. */
const revenueCard = (page: Page) =>
  page.getByRole('main').getByText('Doanh số hôm nay', { exact: true }).locator('..');

test.describe('dashboard', () => {
  test.use({ storageState: sessionFile('staff') });

  test('revenue today and the comparison with yesterday leave cancelled orders out', async ({ page }) => {
    // A big cancelled order today and one yesterday: counted, they would move both figures.
    for (const createdDaysAgo of [0, 1]) {
      const order = await createOrder({ customerPart: 'Minh Tâm', productId: 'prod-vien-10', quantity: 400, createdDaysAgo });
      await db.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
    }
    const today = await revenueBetween(vietnamDayStart(0));
    const yesterday = await revenueBetween(vietnamDayStart(1), vietnamDayStart(0));

    await page.goto('/dashboard');
    const card = revenueCard(page);
    await expect(card.locator('p.font-mono')).toHaveText(`${today.toLocaleString('vi-VN')}đ`);
    await expect(card).toContainText(trendText(today, yesterday));
  });

  test('an order saved from the dashboard shows in the recent orders without a reload', async ({ page }) => {
    const customer = await customerNamed('Minh Tâm');
    const before = await db.order.count({ where: { customerId: customer.id } });

    await page.goto('/dashboard');
    const recent = page.locator('table.table-industrial tbody tr');
    await expect(recent.first()).toBeVisible();
    await expect(recent.first()).not.toContainText('Đá Viên 10kg × 37');

    const drawer = await openOrderDrawerFor(page, 'Minh Tâm');
    await (await gridCell(drawer, 'Đá Viên', 10)).locator('input').fill('37');
    await drawer.getByRole('button', { name: /XÁC NHẬN TẠO ĐƠN/ }).click();
    await expectToast(page, /Đã lên đơn thành công/);
    await expect(drawer).toBeHidden();
    await expect.poll(() => db.order.count({ where: { customerId: customer.id } })).toBe(before + 1);

    // No page.reload(): the refreshed server props alone must reach the table.
    await expect(recent.first()).toContainText(customer.name);
    await expect(recent.first()).toContainText('Đá Viên 10kg × 37');

    // Do not leave the bags reserved for the specs that follow.
    const saved = await db.order.findFirstOrThrow({ where: { customerId: customer.id }, orderBy: { createdAt: 'desc' } });
    await db.order.update({ where: { id: saved.id }, data: { status: 'CANCELLED' } });
  });
});
