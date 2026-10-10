import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { db } from './support/db';

test.describe('what each role can reach', () => {
  test.describe('staff', () => {
    test.use({ storageState: sessionFile('staff') });

    test('have no manager screens in the menu and are sent away from their addresses', async ({ page }) => {
      await page.goto('/dashboard');
      for (const entry of ['Sản phẩm & giá', 'Kho lạnh', 'Đối soát', 'Cài đặt']) {
        await expect(page.getByRole('link', { name: entry })).toHaveCount(0);
      }
      for (const path of ['/config/prices', '/inventory', '/settle']) {
        await page.goto(path);
        await expect(page, path).toHaveURL((url) => url.pathname === '/dashboard');
      }
    });

    test("cannot open a customer's price page, in the drawer or by its address", async ({ page }) => {
      const customer = await db.customer.findFirstOrThrow({ where: { name: { contains: 'Minh Tâm' } } });
      await page.goto('/customers');
      await page.getByText(customer.name).first().click();
      await expect(page.getByText('Thông tin liên hệ')).toBeVisible();
      await expect(page.getByText('Bảng giá riêng của khách này')).toHaveCount(0);
      await page.goto(`/customers/${customer.id}`);
      await expect(page).toHaveURL((url) => url.pathname === '/customers');
    });

    test('are refused by the manager-only APIs', async ({ page }) => {
      for (const path of ['/api/inventory', '/api/inventory/counts', '/api/inventory/counts/summary', '/api/staff']) {
        expect((await page.request.get(path)).status(), path).toBe(403);
      }
      const product = await page.request.post('/api/products', { data: { name: 'Không được phép', sizeKg: 5, price: 1 } });
      expect(product.status()).toBe(403);
    });
  });

  test.describe('manager', () => {
    test.use({ storageState: sessionFile('manager') });

    test("reaches a customer's price page from the customer drawer", async ({ page }) => {
      await page.goto('/customers');
      await page.getByText('Đại Lý Nước Ngọt Minh Tâm').first().click();
      await page.getByRole('link', { name: 'Bảng giá riêng của khách này' }).click();
      await expect(page.getByRole('heading', { name: 'Bảng giá cho Đại Lý Nước Ngọt Minh Tâm' })).toBeVisible();
      // The page sits inside the app layout.
      await expect(page.getByRole('link', { name: 'Đối soát' })).toBeVisible();
    });
  });

  test.describe('driver', () => {
    test.use({ storageState: sessionFile('driver') });

    test('only has the delivery screen', async ({ page }) => {
      for (const path of ['/orders', '/dashboard', '/settings']) {
        await page.goto(path);
        await expect(page, path).toHaveURL((url) => url.pathname === '/driver');
      }
      expect((await page.request.get('/api/orders')).status()).toBe(403);
    });
  });
});
