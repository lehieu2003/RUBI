import { expect, test, type APIRequestContext } from '@playwright/test';
import { sessionFile } from './support/env';
import { createOrder, db, setStock, stockOf } from './support/db';
import { expectToast } from './support/app';

// A stock count only sees what is inside the cold store. Bags of orders that
// left the store but are not settled yet (SHIPPING on a truck, DELIVERED at the
// customer) are still on the books until settlement deducts them, so the count
// must neither log them as a loss nor take them off the books a second time.
// PENDING orders are still in the store and are part of the count.

const CUSTOMER = 'Minh Tâm';
const PRODUCT = 'prod-mi-20';

const count = (request: APIRequestContext, quantity: number) =>
  request.post('/api/inventory', { data: { productId: PRODUCT, quantity, mode: 'SET' } });

const newestCount = () =>
  db.stockCount.findFirstOrThrow({ where: { productId: PRODUCT }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });

async function settle(request: APIRequestContext, orderId: string) {
  const order = await db.order.update({
    where: { id: orderId },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
    include: { orderItems: true },
  });
  const items = order.orderItems.map((item) => ({ id: item.id, actualQty: item.quantity }));
  const response = await request.patch(`/api/orders/${orderId}/reconcile`, { data: { items } });
  expect(response.status()).toBe(200);
}

test.describe.serial('stock count while orders are out for delivery', () => {
  test.use({ storageState: sessionFile('manager') });

  test.beforeEach(async () => {
    // Leftovers of other specs would change what is out for delivery.
    await db.order.updateMany({
      where: { status: { in: ['PENDING', 'SHIPPING', 'DELIVERED'] }, orderItems: { some: { productId: PRODUCT } } },
      data: { status: 'CANCELLED' },
    });
    await setStock(PRODUCT, 100);
  });

  for (const status of ['SHIPPING', 'DELIVERED'] as const) {
    test(`bags of a ${status} order are not a loss and are deducted once at settlement`, async ({ request }) => {
      const out = await createOrder({ customerPart: CUSTOMER, productId: PRODUCT, quantity: 20, status });
      await createOrder({ customerPart: CUSTOMER, productId: PRODUCT, quantity: 5 }); // PENDING: still in the store

      const response = await count(request, 80);
      expect(response.status()).toBe(200);

      const stockCount = await newestCount();
      expect([stockCount.bookQuantity, stockCount.countedQuantity]).toEqual([80, 80]);
      expect(await stockOf(PRODUCT)).toBe(100);

      const history = await (await request.get(`/api/inventory/counts?productId=${PRODUCT}&limit=1`)).json();
      expect(history.data[0].difference).toBe(0);

      await settle(request, out.id);
      expect(await stockOf(PRODUCT)).toBe(80);
    });
  }

  test('a real loss is still a loss while an order is on a truck', async ({ request }) => {
    await createOrder({ customerPart: CUSTOMER, productId: PRODUCT, quantity: 20, status: 'SHIPPING' });

    expect((await count(request, 77)).status()).toBe(200);

    const stockCount = await newestCount();
    expect(stockCount.countedQuantity - stockCount.bookQuantity).toBe(-3);
    expect(await stockOf(PRODUCT)).toBe(97);
  });

  test('with nothing out for delivery the count replaces the balance as before', async ({ request }) => {
    expect((await count(request, 92)).status()).toBe(200);

    const stockCount = await newestCount();
    expect([stockCount.bookQuantity, stockCount.countedQuantity]).toEqual([100, 92]);
    expect(await stockOf(PRODUCT)).toBe(92);
  });

  test('the count dialog compares with what should be in the store', async ({ page }) => {
    await createOrder({ customerPart: CUSTOMER, productId: PRODUCT, quantity: 20, status: 'SHIPPING' });

    await page.goto('/inventory');
    const row = page.locator('tbody tr', { hasText: 'Đá Mi' }).filter({ hasText: '20 kg' });
    await row.getByRole('button', { name: 'Kiểm kho' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Đang giao, chưa đối soát');
    await expect(dialog).toContainText('Phải có trong kho');
    await dialog.locator('input[type=number]').fill('80');
    await expect(dialog).toContainText('Khớp với sổ');
    await dialog.getByRole('button', { name: 'XÁC NHẬN KIỂM KHO' }).click();
    await expectToast(page, /khớp sổ/);
    expect(await stockOf(PRODUCT)).toBe(100);
  });
});
