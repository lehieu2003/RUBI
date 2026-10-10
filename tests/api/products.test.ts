import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { CreateProductBody, UpdateProductBody } from '../../src/lib/contracts/products';

const listRoute = readFileSync('src/app/api/products/route.ts', 'utf8');
const detailRoute = readFileSync('src/app/api/products/[id]/route.ts', 'utf8');

describe('product request schemas', () => {
  it('a new product needs a name, a whole size and a price', () => {
    assert.ok(CreateProductBody.safeParse({ name: 'Đá Bi', sizeKg: 10, price: 22000 }).success);
    assert.equal(CreateProductBody.safeParse({ name: 'Đá Bi', sizeKg: 10 }).success, false);
    assert.equal(CreateProductBody.safeParse({ name: 'Đá Bi', sizeKg: 10, price: 0 }).success, false);
    assert.equal(CreateProductBody.safeParse({ name: '  ', sizeKg: 10, price: 22000 }).success, false);
    assert.equal(CreateProductBody.safeParse({ name: 'Đá Bi', sizeKg: 2.5, price: 22000 }).success, false);
  });

  it('trims the name', () => {
    assert.equal(CreateProductBody.parse({ name: '  Đá Bi ', sizeKg: 10, price: 22000 }).name, 'Đá Bi');
  });

  it('an update changes only what is sent and never carries a price', () => {
    assert.deepEqual(UpdateProductBody.parse({ isActive: false }), { isActive: false });
    assert.deepEqual(UpdateProductBody.parse({ name: 'Đá Cây', price: 1 }), { name: 'Đá Cây' });
    assert.equal(UpdateProductBody.safeParse({ sizeKg: -1 }).success, false);
  });
});

describe('product API source checks', () => {
  it('creates the product and its default price together, scoped to the factory', () => {
    assert.match(listRoute, /CreateProductBody\.safeParse/);
    assert.match(listRoute, /factoryId: session\.factoryId,\s*globalPrices: \{ create: \{ pricePerUnit:/);
  });

  it('refuses a duplicate name and size, whatever the letter case', () => {
    for (const source of [listRoute, detailRoute]) {
      assert.match(source, /name: \{ equals: name, mode: 'insensitive' \}/);
      assert.match(source, /409,\s*'PRODUCT_EXISTS'/);
    }
  });

  it('keeps the size of a product that already has orders', () => {
    assert.match(detailRoute, /existing\._count\.orderItems > 0/);
    assert.match(detailRoute, /409,\s*'PRODUCT_HAS_ORDERS'/);
  });

  it('never deletes a product: it is taken off sale instead', () => {
    assert.doesNotMatch(listRoute + detailRoute, /export async function DELETE|product\.delete/);
    assert.match(detailRoute, /where: \{ id, factoryId: session\.factoryId \}/);
  });
});

describe('products and prices screen', () => {
  const page = readFileSync('src/app/config/prices/page.tsx', 'utf8');
  const table = readFileSync('src/components/pricing/product-table.tsx', 'utf8');

  it('lists discontinued products too, so they can be sold again', () => {
    assert.doesNotMatch(page, /isActive: true/);
    assert.match(table, /product\.isActive \? 'Ngừng bán' : 'Bán lại'/);
  });

  it('locks the size of a product with orders and shows the server message on failure', () => {
    assert.match(table, /disabled=\{product\.hasOrders\}/);
    assert.match(table, /json\?\.error \?\? 'Không thể lưu thay đổi'/);
  });
});

describe('order entry grid', () => {
  const matrix = readFileSync('src/components/order/order-matrix.tsx', 'utf8');

  it('is built from the catalogue, not from a fixed list of names and sizes', () => {
    assert.doesNotMatch(matrix, /'Đá Bi'|'Đá Viên'|\[5, 10, 20\]/);
    assert.match(matrix, /const names = \[\.\.\.new Set\(active\.map\(\(p\) => p\.name\)\)\]/);
    assert.match(matrix, /const cols = \[\.\.\.new Set\(active\.map\(\(p\) => p\.sizeKg\)\)\]\.sort/);
  });

  it('offers only products on sale', () => {
    assert.match(matrix, /const active = products\.filter\(\(p\) => p\.isActive\)/);
  });
});
