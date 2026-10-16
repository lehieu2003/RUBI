import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { createOrder, db, orderCode, setStock } from './support/db';
import { expectToast } from './support/app';

// After settlement the order is worth what was delivered (actualQty × unitPrice),
// the same amount as the debt it booked. Orders not settled keep the ordered amount.
const PRODUCT = 'prod-bi-5';

test.describe.serial('the total of a settled order is the delivered amount', () => {
  test.use({ storageState: sessionFile('manager') });

  let settledId = '';
  let openId = '';
  let price = 0;

  test('settle 8 of 10: total, line total and debt are all 8 × the price', async ({ page }) => {
    await setStock(PRODUCT, 100, 1);
    const settled = await createOrder({ customerPart: 'Minh Tâm', productId: PRODUCT, quantity: 10, status: 'DELIVERED' });
    const open = await createOrder({ customerPart: 'Minh Tâm', productId: PRODUCT, quantity: 10, status: 'DELIVERED' });
    settledId = settled.id;
    openId = open.id;
    price = Number(settled.orderItems[0].unitPrice);

    await page.goto('/settle');
    const card = page.locator('div.rounded.border', { hasText: orderCode(settledId) });
    await card.getByRole('button', { name: 'CHỐT ĐƠN', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Chốt đơn đối soát' });
    await dialog.locator('input[type=number]').fill('8');
    await dialog.getByRole('button', { name: 'XÁC NHẬN CHỐT' }).click();
    await expectToast(page, 'Đã chốt đơn thành công');

    const order = await db.order.findUniqueOrThrow({ where: { id: settledId }, include: { orderItems: true } });
    expect(order.status).toBe('COMPLETED');
    expect(order.orderItems[0].actualQty).toBe(8);
    const debt = await db.customerDebtLedger.findFirstOrThrow({ where: { notes: `Order ${settledId} delivered` } });
    expect(Number(debt.amount)).toBe(8 * price);
    expect(Number(order.total)).toBe(Number(debt.amount));
    expect(Number(order.orderItems[0].lineTotal)).toBe(8 * price);
    // The ordered quantity is kept: it is still shown next to what was delivered.
    expect(order.orderItems[0].quantity).toBe(10);

    // The order not settled yet keeps the ordered amount.
    const untouched = await db.order.findUniqueOrThrow({ where: { id: openId }, include: { orderItems: true } });
    expect(Number(untouched.total)).toBe(10 * price);
    expect(Number(untouched.orderItems[0].lineTotal)).toBe(10 * price);
  });

  test('the order list, the debt export and the order page show the delivered amount', async ({ page }) => {
    const list = await page.request.get('/api/orders?status=COMPLETED&limit=100');
    expect(list.ok()).toBe(true);
    const listed = ((await list.json()).data as { id: string; total: number; orderItems: { lineTotal: number }[] }[])
      .find((order) => order.id === settledId);
    expect(listed?.total).toBe(8 * price);
    expect(listed?.orderItems[0].lineTotal).toBe(8 * price);

    const exported = await page.request.get('/api/customers/debt-export');
    expect(exported.ok()).toBe(true);
    const row = ((await exported.json()).data.orders as { id: string; total: number }[]).find((order) => order.id === settledId);
    expect(row?.total).toBe(8 * price);

    await page.goto(`/orders/${settledId}`);
    await expect(page.getByText(`${(8 * price).toLocaleString('vi-VN')}đ`).first()).toBeVisible();
    await expect(page.getByText('thực giao 8')).toBeVisible();
    await expect(page.getByText(`${(10 * price).toLocaleString('vi-VN')}đ`)).toHaveCount(0);
  });

  test('the backfill migration fixes orders settled before, and only those', async () => {
    const migrations = path.join(process.cwd(), 'prisma', 'migrations');
    const dir = readdirSync(migrations).find((name) => name.endsWith('_backfill_delivered_order_totals'));
    expect(dir, 'a backfill migration exists').toBeTruthy();
    const sql = readFileSync(path.join(migrations, dir!, 'migration.sql'), 'utf8');
    const statements = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);

    // Settled before the fix: actualQty set, total and line total still the ordered amount.
    const stale = await createOrder({ customerPart: 'Minh Tâm', productId: PRODUCT, quantity: 10, status: 'DELIVERED' });
    await db.order.update({ where: { id: stale.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
    await db.orderItem.update({ where: { id: stale.orderItems[0].id }, data: { actualQty: 7 } });
    // A COMPLETED order without actualQty: nothing to derive the delivered amount from, left as it is.
    const unknown = await createOrder({ customerPart: 'Minh Tâm', productId: PRODUCT, quantity: 10, status: 'DELIVERED' });
    await db.order.update({ where: { id: unknown.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
    // A DELIVERED order with actualQty typed in is not settled: left as it is.
    const notSettled = await createOrder({ customerPart: 'Minh Tâm', productId: PRODUCT, quantity: 10, status: 'DELIVERED' });
    await db.orderItem.update({ where: { id: notSettled.orderItems[0].id }, data: { actualQty: 5 } });

    // Run twice: the second run changes nothing.
    for (let run = 0; run < 2; run += 1) {
      for (const statement of statements) await db.$executeRawUnsafe(statement);
    }

    const totalOf = async (id: string) => {
      const order = await db.order.findUniqueOrThrow({ where: { id }, include: { orderItems: true } });
      return { total: Number(order.total), line: Number(order.orderItems[0].lineTotal) };
    };
    expect(await totalOf(stale.id)).toEqual({ total: 7 * price, line: 7 * price });
    expect(await totalOf(unknown.id)).toEqual({ total: 10 * price, line: 10 * price });
    expect(await totalOf(notSettled.id)).toEqual({ total: 10 * price, line: 10 * price });
    expect(await totalOf(settledId)).toEqual({ total: 8 * price, line: 8 * price });
    expect(await totalOf(openId)).toEqual({ total: 10 * price, line: 10 * price });
  });

  test('a settlement must give every line exactly once, or nothing is booked', async ({ request }) => {
    // Two lines: a list that leaves one out would book a total that its lines do not add up to.
    const order = await createOrder({ customerPart: 'Minh Tâm', productId: PRODUCT, quantity: 10, status: 'DELIVERED' });
    const extraPrice = Number((await db.globalPrice.findUniqueOrThrow({ where: { productId: 'prod-vien-10' } })).pricePerUnit);
    const extra = await db.orderItem.create({
      data: { orderId: order.id, productId: 'prod-vien-10', quantity: 4, unitPrice: extraPrice, lineTotal: 4 * extraPrice },
    });
    const first = order.orderItems[0].id;
    const settle = (items: { id: string; actualQty: number }[]) =>
      request.patch(`/api/orders/${order.id}/reconcile`, { data: { items } });

    expect((await settle([{ id: first, actualQty: 8 }])).status()).toBe(400);
    expect((await settle([{ id: first, actualQty: 8 }, { id: first, actualQty: 8 }])).status()).toBe(400);
    const untouched = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { orderItems: true } });
    expect(untouched.status).toBe('DELIVERED');
    expect(untouched.orderItems.every((item) => item.actualQty === null)).toBe(true);
    expect(await db.customerDebtLedger.count({ where: { notes: `Order ${order.id} delivered` } })).toBe(0);

    // Every line once: settled, and the lines add up to the total booked as debt.
    expect((await settle([{ id: first, actualQty: 8 }, { id: extra.id, actualQty: 3 }])).status()).toBe(200);
    const settled = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { orderItems: true } });
    const lines = settled.orderItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    expect(Number(settled.total)).toBe(8 * price + 3 * extraPrice);
    expect(lines).toBe(Number(settled.total));
    const debt = await db.customerDebtLedger.findFirstOrThrow({ where: { notes: `Order ${order.id} delivered` } });
    expect(Number(debt.amount)).toBe(Number(settled.total));
  });
});
