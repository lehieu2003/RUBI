import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { CustomerPriceBody, GlobalPriceBody } from '../../src/lib/contracts/prices';
import { CreateProductBody } from '../../src/lib/contracts/products';

// Payments are whole VND, so a price with a fractional part leaves a debt
// that can never be paid off exactly.
describe('prices are whole VND', () => {
  it('the default price of a product refuses a fractional amount', () => {
    assert.ok(GlobalPriceBody.safeParse({ productId: 'p', price: 12500 }).success);
    assert.equal(GlobalPriceBody.safeParse({ productId: 'p', price: 12500.5 }).success, false);
    assert.equal(GlobalPriceBody.safeParse({ productId: 'p', price: 0 }).success, false);
  });

  it('a customer own price refuses a fractional amount', () => {
    assert.ok(CustomerPriceBody.safeParse({ customerId: 'c', productId: 'p', price: 12500 }).success);
    assert.equal(CustomerPriceBody.safeParse({ customerId: 'c', productId: 'p', price: 12500.5 }).success, false);
    assert.equal(CustomerPriceBody.safeParse({ customerId: 'c', productId: 'p', price: -1 }).success, false);
  });

  it('a new product refuses a fractional price', () => {
    assert.equal(CreateProductBody.safeParse({ name: 'Đá Bi', sizeKg: 10, price: 12500.5 }).success, false);
  });

  it('the routes validate with those schemas', () => {
    assert.match(readFileSync('src/app/api/prices/global/route.ts', 'utf8'), /GlobalPriceBody\.safeParse\(body\)/);
    assert.match(
      readFileSync('src/app/api/prices/customer/override/route.ts', 'utf8'),
      /CustomerPriceBody\.safeParse\(body\)/
    );
  });

  it('the price forms refuse a fractional amount before sending it', () => {
    const form = readFileSync('src/components/pricing/customer-price-form.tsx', 'utf8');
    const table = readFileSync('src/components/pricing/product-table.tsx', 'utf8');
    assert.doesNotMatch(form, /parseFloat/);
    assert.match(form, /!Number\.isInteger\(newPrice\) \|\| newPrice <= 0/);
    assert.match(table, /!Number\.isInteger\(price\) \|\| price <= 0/);
  });
});
