import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { createOrder, db, orderCode } from './support/db';

// The delivery slip goes to the customer with the bags: it must carry the
// factory's own name, address and phone, and what the customer asked for.
test.describe('the delivery slip', () => {
  test.use({ storageState: sessionFile('staff') });

  const NOTE = 'Giao cổng sau, gọi trước 10 phút';
  let orderId = '';
  let factory: { name: string; phone: string | null; address: string | null };

  test.beforeAll(async () => {
    const order = await createOrder({ customerPart: 'Minh Tâm', productId: 'prod-bi-5', quantity: 4 });
    await db.order.update({ where: { id: order.id }, data: { notes: NOTE } });
    orderId = order.id;
    factory = await db.factory.findUniqueOrThrow({ where: { id: order.factoryId } });
    expect(factory.address, 'the seeded factory has an address').toBeTruthy();
    expect(factory.phone, 'the seeded factory has a phone').toBeTruthy();
  });

  test('printed from the order list', async ({ page }) => {
    await page.goto('/orders');
    await page.locator('tr', { hasText: orderCode(orderId) }).getByRole('button', { name: /Xem/ }).click();
    await expect(page.getByRole('button', { name: 'In phiếu K80' })).toBeVisible();

    const slip = page.locator('.print-slip .print-slip');
    await expect(slip).toContainText(factory.name);
    await expect(slip).toContainText(factory.address!);
    await expect(slip).toContainText(`Tel: ${factory.phone}`);
    await expect(slip).toContainText(`Ghi chú: ${NOTE}`);
    await expect(slip).toContainText('Đại Lý Nước Ngọt Minh Tâm');
    await expect(slip).not.toContainText('ICEFLOW');
    await expect(slip).not.toContainText('123 Đường ABC');
    // The slip is for the paper: it does not show under the order list.
    await expect(slip).toBeHidden();
  });

  test('printed from the order page, on 80mm paper', async ({ page }) => {
    await page.goto(`/orders/${orderId}`);
    // The browser's print dialog would block the page.
    await page.evaluate(() => { window.print = () => {}; });
    await page.getByRole('button', { name: 'IN PHIẾU GIAO HÀNG (K80)', exact: true }).click();

    const slip = page.locator('.print-slip');
    await expect(slip).toContainText(factory.name);
    await page.emulateMedia({ media: 'print' });
    await expect(slip).toBeVisible();
    await expect(slip.getByText(factory.name)).toBeVisible();
    await expect(slip.getByText(factory.address!, { exact: false })).toBeVisible();
    await expect(slip.getByText(NOTE, { exact: false })).toBeVisible();
    await expect(slip).not.toContainText('ICEFLOW');
    // Product, quantity, price and amount stay on one line.
    const cells = slip.locator('tbody tr').first().locator('td');
    const tops = await cells.evaluateAll((tds) => tds.map((td) => Math.round(td.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    // Nothing but the slip is on the paper.
    await expect(page.getByRole('link', { name: 'QUAY LẠI DANH SÁCH' })).toBeHidden();
  });
});
