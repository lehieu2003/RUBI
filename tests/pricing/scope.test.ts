import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('pricing factory scope source checks', () => {
  it('requires factory context before loading order-entry customer prices', () => {
    const source = read('src/lib/actions/orders.ts');
    assert.match(source, /const session = await getSession\(\)/);
    assert.match(source, /if \(!session\?\.factoryId\)/);
    assert.match(source, /const factoryId = session\.factoryId/);
    assert.match(source, /where: \{ id: customerId, factoryId \}/);
  });

  it('prices an order on the server and limits order entry to the office', () => {
    const source = read('src/lib/actions/orders.ts');
    assert.match(source, /session\.role !== 'ADMIN' && session\.role !== 'STAFF'/);
    assert.equal(source.match(/await requireOfficeFactoryId\(\)/g)?.length, 2);
    assert.match(source, /unitPrice: prices\.get\(item\.productId\)!/);
    // a product with no price stops the order instead of being sold for 0
    assert.match(source, /productIds\.some\(\(productId\) => !prices\.has\(productId\)\)/);
    // one parallel round of checks, priced from the ordered products only
    assert.match(source, /await Promise\.all\(\[\s*prisma\.customer\.findFirst/);
    assert.match(source, /where: \{ productId: \{ in: productIds \}, product: \{ factoryId \} \}/);
    assert.match(source, /where: \{ id: \{ in: productIds \}, factoryId, isActive: true \}/);
    // the request carries no price at all
    const schema = source.slice(source.indexOf('const OrderItemSchema'), source.indexOf('const SaveOrderSchema'));
    assert.doesNotMatch(schema, /unitPrice|lineTotal/);
    assert.doesNotMatch(read('src/components/order/order-entry-drawer.tsx'), /unitPrice|lineTotal/);
  });

  it('filters pricing reads through factory-owned products and customers', () => {
    const actionSource = read('src/lib/actions/orders.ts');
    const pricingSource = read('src/lib/pricing.ts');
    const customerPageSource = read('src/app/customers/[id]/page.tsx');
    const globalPageSource = read('src/app/config/prices/page.tsx');

    for (const source of [actionSource, pricingSource]) {
      assert.match(source, /product: \{ isActive: true, factoryId \}/);
      assert.match(source, /customer: \{ factoryId \}/);
      assert.match(source, /product: \{ factoryId \}/);
    }

    assert.match(customerPageSource, /product: \{ factoryId: session\.factoryId \}/);
    assert.match(customerPageSource, /customer: \{ factoryId: session\.factoryId \}/);
    assert.match(globalPageSource, /product: \{ factoryId: session\.factoryId \}/);
  });

  it('validates product ownership before global price writes', () => {
    const source = read('src/app/api/prices/global/route.ts');
    assert.match(source, /const session = await requireRole\(\['ADMIN'\]\)/);
    assert.match(source, /where: \{ id: productId, factoryId: session\.factoryId \}/);
    assert.match(source, /Không tìm thấy sản phẩm/);
  });

  it('validates customer and product ownership before customer override writes and deletes', () => {
    const source = read('src/app/api/prices/customer/override/route.ts');
    const customerChecks = source.match(/where: \{ id: customerId, factoryId: session\.factoryId \}/g) ?? [];
    const productChecks = source.match(/where: \{ id: productId, factoryId: session\.factoryId \}/g) ?? [];

    assert.equal(customerChecks.length, 2);
    assert.equal(productChecks.length, 2);
    assert.match(source, /Không tìm thấy khách hàng hoặc sản phẩm/);
  });
});
