import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext, type APIResponse, type Page, type Request } from '@playwright/test';
import { sessionFile } from './support/env';
import { customerNamed, db, lockWaiters } from './support/db';
import { expectToast, gridCell, openOrderDrawerFor, openPage } from './support/app';

// Taking an order must happen once per submission, as payments, shells and
// production batches do (e2e/idempotent-writes.spec.ts): a retry after a lost
// answer or the same request delivered twice must not leave two orders. The
// app sends an Idempotency-Key header, the web drawer passes the key to the
// server action.

const HEADER = 'Idempotency-Key';
const CUSTOMER = 'Năm Căn';
const PRODUCT = 'prod-vien-10';

async function ordersOfCustomer(): Promise<number> {
  const customer = await customerNamed(CUSTOMER);
  return db.order.count({ where: { customerId: customer.id } });
}

async function send(request: APIRequestContext, key?: string, quantity = 2): Promise<APIResponse> {
  const customer = await customerNamed(CUSTOMER);
  return request.post('/api/orders', {
    data: { customerId: customer.id, items: [{ productId: PRODUCT, quantity }], notes: 'Giao cổng sau' },
    headers: key ? { [HEADER]: key } : undefined,
  });
}

test.describe('an order sent twice is taken once', () => {
  test.use({ storageState: sessionFile('staff') });

  let before = 0;
  const taken = async () => (await ordersOfCustomer()) - before;
  test.beforeEach(async () => {
    before = await ordersOfCustomer();
  });

  test('sent twice with the same key: one order, the same answer twice', async ({ request }) => {
    const key = randomUUID();
    const first = await send(request, key);
    const second = await send(request, key);

    expect(first.status()).toBe(201);
    expect(second.status()).toBe(201);
    expect(await second.json()).toEqual(await first.json());
    expect(await taken()).toBe(1);
  });

  test('sent twice at the same moment with the same key: one order, the same answer twice', async ({ request }) => {
    const customer = await customerNamed(CUSTOMER);
    const key = randomUUID();
    let pending: Array<Promise<APIResponse>> = [];
    await db.$transaction(
      async (tx) => {
        // The order row references the customer, so its insert waits on this.
        await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customer.id} FOR UPDATE`;
        pending = [send(request, key), send(request, key)];
        await expect.poll(lockWaiters, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
      },
      { timeout: 30_000 }
    );
    const [first, second] = await Promise.all(pending);

    expect([first.status(), second.status()]).toEqual([201, 201]);
    expect(await second.json()).toEqual(await first.json());
    expect(await taken()).toBe(1);
  });

  test('two submissions with their own keys are two orders', async ({ request }) => {
    expect((await send(request, randomUUID())).status()).toBe(201);
    expect((await send(request, randomUUID())).status()).toBe(201);
    expect(await taken()).toBe(2);
  });

  test('without a key every request is an order, as before', async ({ request }) => {
    expect((await send(request)).status()).toBe(201);
    expect((await send(request)).status()).toBe(201);
    expect(await taken()).toBe(2);
  });

  test('a key reused with other quantities is refused and takes nothing', async ({ request }) => {
    const key = randomUUID();
    expect((await send(request, key)).status()).toBe(201);
    const reused = await send(request, key, 5);

    expect(reused.status()).toBe(422);
    expect((await reused.json()).code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await taken()).toBe(1);
  });

  test('a refused order releases its key: corrected and resent, it is taken', async ({ request }) => {
    const customer = await customerNamed(CUSTOMER);
    const key = randomUUID();
    const refused = await request.post('/api/orders', {
      data: { customerId: customer.id, items: [{ productId: 'no-such-product', quantity: 1 }] },
      headers: { [HEADER]: key },
    });
    expect(refused.status()).toBe(400);
    // Same key, another body: accepted, since the refusal kept nothing.
    expect((await send(request, key)).status()).toBe(201);
    expect(await taken()).toBe(1);
  });

  test.describe('from the web order drawer', () => {
    const isSave = (request: Request) =>
      request.method() === 'POST' &&
      Boolean(request.headers()['next-action']) &&
      (request.postData() ?? '').includes('"lineItems"');

    async function fillOrder(page: Page) {
      await openPage(page, '/orders');
      const drawer = await openOrderDrawerFor(page, CUSTOMER);
      await (await gridCell(drawer, 'Đá Viên', 10)).locator('input').fill('2');
      return drawer;
    }

    test('the same save reaching the server twice is one order', async ({ page }) => {
      await page.route('**/*', async (route) => {
        if (!isSave(route.request())) return route.fallback();
        await route.fetch(); // delivered once, its answer dropped
        return route.fulfill({ response: await route.fetch() });
      });
      const drawer = await fillOrder(page);
      await drawer.getByRole('button', { name: /XÁC NHẬN TẠO ĐƠN/ }).click();

      await expectToast(page, /Đã lên đơn thành công/);
      expect(await taken()).toBe(1);
    });

    test('a save whose answer was lost can be confirmed again: one order', async ({ page }) => {
      let lost = false;
      await page.route('**/*', async (route) => {
        if (lost || !isSave(route.request())) return route.fallback();
        lost = true;
        await route.fetch(); // the server takes the order, the answer never arrives
        return route.abort('failed');
      });
      const drawer = await fillOrder(page);
      const confirm = drawer.getByRole('button', { name: /XÁC NHẬN TẠO ĐƠN/ });
      await confirm.click();

      await expect(drawer.getByText(/chưa rõ đơn đã lưu/i)).toBeVisible();
      await expect(confirm).toBeEnabled();
      await confirm.click();

      await expectToast(page, /Đã lên đơn thành công/);
      expect(await taken()).toBe(1);
    });
  });
});
