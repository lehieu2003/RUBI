import { expect, test, type Page } from '@playwright/test';
import { sessionFile } from './support/env';
import { customerNamed, db } from './support/db';
import { expectToast, gridCell, openOrderDrawerFor } from './support/app';

// A customer without a seeded own price, so every override here is ours.
const CUSTOMER = 'Ding Tea';

/** The row of one product on the customer's price page: its name, then its bag size. */
function priceRow(page: Page, name: string, sizeKg: number) {
  return page.locator('tbody tr').filter({ hasText: new RegExp(`^\\s*${name}\\s*${sizeKg}kg`) });
}

async function setOwnPrice(page: Page, name: string, sizeKg: number, price: number) {
  const row = priceRow(page, name, sizeKg);
  await row.getByRole('button', { name: /Đặt giá riêng|Sửa/ }).click();
  await row.locator('input[type=number]').fill(String(price));
  await row.getByRole('button', { name: 'Lưu', exact: true }).click();
}

test.describe.serial('customer own prices', () => {
  test.afterAll(async () => {
    const customer = await customerNamed(CUSTOMER);
    await db.customerPriceOverride.deleteMany({ where: { customerId: customer.id } });
  });

  test.describe('manager', () => {
    test.use({ storageState: sessionFile('manager') });

    test('lists every product on sale and saves an own price for any of them', async ({ page }) => {
      const customer = await customerNamed(CUSTOMER);
      await page.goto(`/customers/${customer.id}`);

      const onSale = await db.product.findMany({ where: { isActive: true } });
      for (const product of onSale) {
        await expect(priceRow(page, product.name, product.sizeKg)).toHaveCount(1);
      }

      await setOwnPrice(page, 'Đá Mi', 20, 27000);
      await expectToast(page, 'Đã lưu giá riêng');
      await expect(priceRow(page, 'Đá Mi', 20)).toContainText('(riêng)');
      const saved = await db.customerPriceOverride.findFirstOrThrow({
        where: { customerId: customer.id, productId: 'prod-mi-20' },
      });
      expect(Number(saved.pricePerUnit)).toBe(27000);
    });

    test('a failed save reverts only that edit, not the ones saved before it', async ({ page }) => {
      const customer = await customerNamed(CUSTOMER);
      await page.goto(`/customers/${customer.id}`);

      await setOwnPrice(page, 'Đá Bi', 20, 39000);
      await expectToast(page, 'Đã lưu giá riêng');
      await expect(priceRow(page, 'Đá Bi', 20)).toContainText('39.000');

      await page.route('**/api/prices/customer/override', (route) => route.abort('failed'));
      await setOwnPrice(page, 'Đá Viên', 5, 14000);
      await expectToast(page, 'Lưu thất bại');

      await expect(priceRow(page, 'Đá Viên', 5)).toContainText('(cơ bản)');
      await expect(priceRow(page, 'Đá Bi', 20)).toContainText('39.000');
      await expect(priceRow(page, 'Đá Bi', 20)).toContainText('(riêng)');
    });

    test('a price with a fractional part is refused: payments are whole VND', async ({ page }) => {
      const customer = await customerNamed(CUSTOMER);
      const own = await page.request.post('/api/prices/customer/override', {
        data: { customerId: customer.id, productId: 'prod-mi-20', price: 12500.5 },
      });
      expect(own.status()).toBe(400);
      const global = await page.request.post('/api/prices/global', {
        data: { productId: 'prod-mi-20', price: 12500.5 },
      });
      expect(global.status()).toBe(400);
      const saved = await db.customerPriceOverride.findFirstOrThrow({
        where: { customerId: customer.id, productId: 'prod-mi-20' },
      });
      expect(Number(saved.pricePerUnit)).toBe(27000);
    });
  });

  test.describe('staff', () => {
    test.use({ storageState: sessionFile('staff') });

    test('the order drawer prices the product at the customer own price', async ({ page }) => {
      await page.goto('/orders');
      const drawer = await openOrderDrawerFor(page, CUSTOMER);
      await expect(await gridCell(drawer, 'Đá Mi', 20)).toContainText('27.000đ');
    });
  });
});
