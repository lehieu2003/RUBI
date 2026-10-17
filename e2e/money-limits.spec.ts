import { expect, test } from '@playwright/test';
import { sessionFile } from './support/env';
import { customerNamed, db } from './support/db';

// Amounts above 99,999,999đ. The contracts accept them (a payment up to
// 10,000,000,000đ), so they must be stored exactly instead of overflowing
// the money columns into a generic 500.

const tag = Date.now().toString(36);

test.describe('large amounts', () => {
  test.use({ storageState: sessionFile('manager') });

  test('a 120,000,000đ payment on enough debt is recorded exactly', async ({ request }) => {
    const seeded = await customerNamed('Minh Tâm');
    const customer = await db.customer.create({
      data: { code: `BIG-${tag}`, name: `Khách Lớn ${tag}`, address: '', phone: '', factoryId: seeded.factoryId },
    });
    await db.customerDebtLedger.createMany({
      data: [
        { customerId: customer.id, type: 'DEBT', amount: 60_000_000, notes: 'e2e' },
        { customerId: customer.id, type: 'DEBT', amount: 70_000_000, notes: 'e2e' },
      ],
    });

    const response = await request.post(`/api/customers/${customer.id}/payments`, {
      data: { amount: 120_000_000 },
    });

    expect(response.status()).toBe(201);
    expect((await response.json()).data.outstandingDebt).toBe(10_000_000);
    const payment = await db.customerDebtLedger.findFirstOrThrow({
      where: { customerId: customer.id, type: 'PAYMENT' },
    });
    expect(payment.amount.toFixed(2)).toBe('120000000.00');
  });

  test.describe('an order worth more than 99,999,999đ', () => {
    let productId = '';

    test.beforeAll(async () => {
      const seeded = await customerNamed('Minh Tâm');
      const product = await db.product.create({
        data: {
          name: `Đá Đắt ${tag}`,
          sizeKg: 7,
          unit: 'Bao',
          factoryId: seeded.factoryId,
          globalPrices: { create: { pricePerUnit: 50_000_000 } },
        },
      });
      productId = product.id;
    });

    test.afterAll(async () => {
      await db.product.update({ where: { id: productId }, data: { isActive: false } });
    });

    test('is stored with its exact total', async ({ request }) => {
      const customer = await customerNamed('Minh Tâm');
      const response = await request.post('/api/orders', {
        data: { customerId: customer.id, items: [{ productId, quantity: 3 }] },
      });

      expect(response.status()).toBe(201);
      const order = await db.order.findFirstOrThrow({
        where: { orderItems: { some: { productId } } },
        include: { orderItems: true },
      });
      expect(order.total.toFixed(2)).toBe('150000000.00');
      expect(order.orderItems[0].lineTotal.toFixed(2)).toBe('150000000.00');
    });

    test('a price the columns cannot hold is refused with 400, not a 500', async ({ request }) => {
      const customer = await customerNamed('Minh Tâm');
      const global = await request.post('/api/prices/global', { data: { productId, price: 2_000_000_000_000 } });
      const override = await request.post('/api/prices/customer/override', {
        data: { customerId: customer.id, productId, price: 2_000_000_000_000 },
      });

      expect(global.status()).toBe(400);
      expect(override.status()).toBe(400);
      expect(Number((await db.globalPrice.findUniqueOrThrow({ where: { productId } })).pricePerUnit)).toBe(50_000_000);
    });
  });
});
