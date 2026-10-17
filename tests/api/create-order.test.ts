import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CreateOrderBody } from '../../src/lib/contracts/orders';

const read = (path: string) => readFileSync(path, 'utf8');

describe('POST /api/orders', () => {
  const route = read('src/app/api/orders/route.ts');
  const action = read('src/lib/actions/orders.ts');

  it('is for the office and saves through the same code as the web drawer', () => {
    const post = route.slice(route.indexOf('export async function POST'));
    assert.match(post, /await requireRole\(\['ADMIN', 'STAFF'\]\)/);
    assert.match(post, /await saveOrder\(\{ customerId, lineItems: items, notes \}, request\.headers\.get\(IDEMPOTENCY_HEADER\)\)/);
    // The route never writes an order itself: one place prices and logs it.
    assert.doesNotMatch(post, /prisma\.order\.create/);
  });

  it('answers 201, and hides the message of an unexpected failure', () => {
    assert.match(route, /apiSuccess\(result\.order, 201\)/);
    assert.match(route, /result\.status === 500 \? 'Không thể lưu đơn hàng' : result\.error/);
  });

  it('an order that cannot be taken carries its status: 404 customer, 400 product or price', () => {
    assert.match(action, /new OrderEntryError\('Không tìm thấy khách hàng', 404\)/);
    assert.match(action, /new OrderEntryError\('Có sản phẩm không tồn tại hoặc đã ngừng bán', 400\)/);
    assert.match(action, /new OrderEntryError\('Có sản phẩm chưa có giá bán[^']*', 400\)/);
    assert.match(action, /status: error instanceof OrderEntryError \? error\.status : 500/);
  });

  it('the body carries no price, needs a line above 0 and caps the notes', () => {
    const line = { productId: 'p-1', quantity: 2 };
    assert.ok(CreateOrderBody.safeParse({ customerId: 'c-1', items: [line] }).success);
    assert.ok(CreateOrderBody.safeParse({ customerId: 'c-1', items: [line], notes: ' Giao cổng sau ' }).success);
    const priced = CreateOrderBody.parse({ customerId: 'c-1', items: [{ ...line, unitPrice: 1 }] });
    assert.deepEqual(priced.items, [line], 'a price sent by the client is dropped');

    for (const body of [
      { customerId: '', items: [line] },
      { customerId: 'c-1', items: [] },
      { customerId: 'c-1', items: [{ productId: 'p-1', quantity: 0 }] },
      { customerId: 'c-1', items: [{ productId: 'p-1', quantity: -1 }] },
      { customerId: 'c-1', items: [{ productId: 'p-1', quantity: 1.5 }] },
      { customerId: 'c-1', items: [line], notes: 'x'.repeat(501) },
    ]) {
      assert.equal(CreateOrderBody.safeParse(body).success, false, JSON.stringify(body).slice(0, 80));
    }
  });
});

describe('GET /api/customers/[id]/prices', () => {
  const route = read('src/app/api/customers/[id]/prices/route.ts');

  it('is for the office and only for a customer of this factory', () => {
    assert.match(route, /await requireRole\(\['ADMIN', 'STAFF'\]\)/);
    assert.match(route, /prisma\.customer\.findFirst\(\{ where: \{ id, factoryId \}/);
    assert.match(route, /apiError\('Không tìm thấy khách hàng', 404\)/);
  });

  it('reads prices within the factory and the sellable stock of the web order drawer', () => {
    assert.match(route, /loadSellableStock\(\)/);
    assert.match(route, /where: \{ isActive: true, factoryId \}/);
    assert.match(route, /where: \{ product: \{ isActive: true, factoryId \} \}/);
    assert.match(route, /where: \{ customerId: id, customer: \{ factoryId \}, product: \{ factoryId \} \}/);
  });

  it("prices an order at the customer's own price, else the default one, and reports both", () => {
    assert.match(route, /price: customPrice \?\? basePrice/);
    assert.match(route, /basePrice,\s*customPrice,/);
  });

  it('says null, not 0, for a product without a price or without a stock record', () => {
    assert.match(route, /base\.get\(product\.id\) \?\? null/);
    assert.match(route, /custom\.get\(product\.id\) \?\? null/);
    assert.match(route, /sellable: sellable\[product\.id\] \?\? null/);
  });
});

describe('GET /api/prices/global', () => {
  const route = read('src/app/api/prices/global/route.ts');
  const get = route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST'));

  it('is for the manager and only lists products of this factory', () => {
    assert.match(get, /await requireRole\(\['ADMIN'\]\)/);
    assert.match(get, /where: \{ factoryId: session\.factoryId \}/);
  });

  it('lists discontinued products too, and null for a product without a price', () => {
    assert.doesNotMatch(get, /where: \{[^}]*isActive/);
    assert.match(get, /price: globalPrice \? Number\(globalPrice\.pricePerUnit\) : null/);
  });
});
