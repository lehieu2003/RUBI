import { expect, test, type Page } from '@playwright/test';
import { sessionFile } from './support/env';
import { customerNamed, db, openQuantityOf, setStock } from './support/db';
import { gridCell, openOrderDrawerFor } from './support/app';

/**
 * Holds back the server action that loads one customer's prices (a POST whose
 * only argument is the customer id), so the test decides when, and how, it
 * answers. Everything else goes through untouched.
 */
async function holdPrices(page: Page, customerId: string) {
  let answer!: (how: 'release' | 'fail') => void;
  const decided = new Promise<'release' | 'fail'>((resolve) => (answer = resolve));
  let seen!: () => void;
  const requested = new Promise<void>((resolve) => (seen = resolve));
  await page.route('**/*', async (route) => {
    const request = route.request();
    const isPriceLoad =
      request.method() === 'POST' &&
      Boolean(request.headers()['next-action']) &&
      request.postData()?.trim() === JSON.stringify([customerId]);
    if (!isPriceLoad) return route.fallback();
    seen();
    if ((await decided) === 'fail') return route.abort('failed');
    return route.continue();
  });
  return {
    requested,
    release: () => answer('release'),
    fail: () => answer('fail'),
  };
}

/** Opens the drawer and picks a customer, without waiting for the prices. */
async function pickCustomer(page: Page, customerPart: string, open = true) {
  if (open) await page.getByRole('button', { name: 'LÊN ĐƠN NHANH' }).first().click();
  const search = page.getByPlaceholder('Tìm khách hàng');
  await search.click();
  await page.keyboard.type(customerPart, { delay: 20 });
  await expect(page.getByText(/Nhấn Enter để chọn nhanh/)).toBeVisible();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog');
  await expect(drawer.locator('input[type=number]').first()).toBeVisible();
  return drawer;
}

const anyPrice = /^\d{1,3}(\.\d{3})+đ$/;

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

  test('keeps a quantity typed before the prices arrive', async ({ page }) => {
    const customer = await customerNamed('Minh Tâm');
    const prices = await holdPrices(page, customer.id);

    await page.goto('/orders');
    const drawer = await pickCustomer(page, 'Minh Tâm');
    await prices.requested;
    const first = drawer.locator('input[type=number]').first();
    await expect(first).toBeFocused();
    await page.keyboard.type('3');
    await expect(first).toHaveValue('3');

    prices.release();
    await expect(drawer.getByText(anyPrice).first()).toBeVisible();
    await expect(first).toHaveValue('3');
    await expect(drawer.getByRole('button', { name: /XÁC NHẬN TẠO ĐƠN/ })).toBeEnabled();
    await page.keyboard.press('Escape');
  });

  test('closing without saving starts the next customer clean', async ({ page }) => {
    const next = await customerNamed('Gió Biển');
    const ordersBefore = await db.order.count({ where: { customerId: next.id } });

    await page.goto('/orders');
    const drawer = await openOrderDrawerFor(page, 'Minh Tâm');
    await (await gridCell(drawer, 'Đá Viên', 10)).locator('input').fill('5');
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();

    const prices = await holdPrices(page, next.id);
    await pickCustomer(page, 'Gió Biển');
    await prices.requested;
    const inputs = drawer.locator('input[type=number]');
    for (const input of await inputs.all()) await expect(input).toHaveValue('');
    await expect(drawer.getByText(anyPrice)).toHaveCount(0);

    // Enter before the prices arrive must not order the old quantities.
    await inputs.first().focus();
    await page.keyboard.press('Enter');
    prices.release();
    await expect(drawer.getByText(anyPrice).first()).toBeVisible();
    await page.waitForTimeout(1000);
    expect(await db.order.count({ where: { customerId: next.id } })).toBe(ordersBefore);
    for (const input of await inputs.all()) await expect(input).toHaveValue('');
    await page.keyboard.press('Escape');
  });

  test('a failed price load says so and blocks the order', async ({ page }) => {
    const customer = await customerNamed('Minh Tâm');
    const ordersBefore = await db.order.count({ where: { customerId: customer.id } });
    const prices = await holdPrices(page, customer.id);

    await page.goto('/orders');
    const drawer = await pickCustomer(page, 'Minh Tâm');
    await prices.requested;
    prices.fail();
    await expect(drawer.getByText(/Không tải được bảng giá/)).toBeVisible();

    await drawer.locator('input[type=number]').first().fill('2');
    await page.keyboard.press('Enter');
    await expect(drawer.getByRole('button', { name: /XÁC NHẬN TẠO ĐƠN/ })).toBeDisabled();
    await page.waitForTimeout(1000);
    expect(await db.order.count({ where: { customerId: customer.id } })).toBe(ordersBefore);
    await page.keyboard.press('Escape');
  });
});
