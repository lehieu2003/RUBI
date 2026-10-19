import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const inventoryPage = readFileSync(
  join(process.cwd(), 'src/app/inventory/page.tsx'),
  'utf-8',
);

const endpoints = readFileSync(
  join(process.cwd(), 'src/lib/api-endpoints/inventory.ts'),
  'utf-8',
);

describe('inventory add-stock source checks', () => {
  it('posts to a defined endpoint (TRANSACTIONS must exist in registry or page uses BASE)', () => {
    const pageUsesBase = /(?:API_ENDPOINTS\.INVENTORY|INVENTORY_ENDPOINTS)\.BASE/.test(inventoryPage);
    const registryDefinesTransactions =
      /TRANSACTIONS/.test(endpoints);
    assert.ok(
      pageUsesBase || registryDefinesTransactions,
      'inventory POST must target a real endpoint'
    );
    assert.doesNotMatch(inventoryPage, /(?:API_ENDPOINTS\.INVENTORY|INVENTORY_ENDPOINTS)\.TRANSACTIONS/);
  });

  it('sends mode ADD so existing stock is increased, never silently replaced', () => {
    assert.match(inventoryPage, /mode:\s*'ADD'/);
    assert.doesNotMatch(inventoryPage, /type:\s*'IN'/);
  });
});
