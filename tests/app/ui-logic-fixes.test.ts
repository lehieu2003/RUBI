import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');

describe('UI-1: inventory fetch does not flash on modal product change', () => {
  it('fetchInventory in src/app/inventory/page.tsx does not depend on selectedProductId', () => {
    const page = read('src/app/inventory/page.tsx');
    // Ensure selectedProductId is not in the dependency array of fetchInventory
    assert.doesNotMatch(page, /const fetchInventory = useCallback\([\s\S]*?\},\s*\[[^\]]*selectedProductId[^\]]*\]\);/);
    assert.match(page, /setSelectedProductId\(\(prev\) => prev \|\| payload\.items\[0\]\.productId\);/);
  });
});

describe('UI-2: settle page invalidates orders cache upon settlement', () => {
  it('src/app/settle/page.tsx uses queryClient to invalidate orders cache on success', () => {
    const page = read('src/app/settle/page.tsx');
    assert.match(page, /import\s*\{[^}]*useQueryClient[^}]*\}\s*from\s*'@tanstack\/react-query';/);
    assert.match(page, /const queryClient = useQueryClient\(\);/);
    assert.match(page, /queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['orders'\]\s*\}\);/);
  });
});

describe('UI-3: bulk assign selection resets across pagination', () => {
  it('src/app/orders/page.tsx resets selectedOrderIds when page changes', () => {
    const page = read('src/app/orders/page.tsx');
    assert.match(
      page,
      /useEffect\(\(\) => \{\s*setSelectedOrderIds\(new Set\(\)\);\s*\}, \[page\]\);/
    );
  });
});
