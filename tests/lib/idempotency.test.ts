import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

// The behaviour (one write per key, replay, 422 on reuse, concurrent resends)
// is covered against a real database in e2e/idempotent-writes.spec.ts. These
// checks keep the three additive writes wired to it.
const read = (path: string) => readFileSync(path, 'utf8');

describe('idempotent additive writes', () => {
  const routes = {
    'src/app/api/customers/[id]/payments/route.ts': '`POST /api/customers/${id}/payments`',
    'src/app/api/deposits/shells/route.ts': "'PATCH /api/deposits/shells'",
    'src/app/api/inventory/route.ts': "'POST /api/inventory'",
  };

  for (const [path, scope] of Object.entries(routes)) {
    it(`${path} claims the key first in its transaction and keeps the answer`, () => {
      const route = read(path);
      assert.ok(route.includes(`Idempotency.from(`) && route.includes(scope), 'reads the key with its scope');
      assert.match(route, /idempotency\.run\(\(\) =>\s*prisma\.\$transaction\(\s*async \(tx\) => \{\s*await idempotency\.begin\(tx\);/);
      assert.match(route, /return idempotency\.finish\(\s*tx,/);
    });
  }

  it('stores only successful answers and refuses a key reused for another request', () => {
    const helper = read('src/lib/idempotency.ts');
    assert.match(helper, /if \(response\.status >= 300\) \{\s*await tx\.idempotencyKey\.delete/);
    assert.match(helper, /422,\s*'IDEMPOTENCY_KEY_REUSED'/);
  });

  for (const path of ['src/components/debt/payment-dialogs.tsx', 'src/app/deposits/shells/page.tsx', 'src/app/inventory/page.tsx']) {
    it(`${path} sends one key per submission and forgets it once written`, () => {
      const form = read(path);
      assert.match(form, /const submission = useSubmissionKey\(\);/);
      assert.match(form, /headers: \{ 'Content-Type': 'application\/json', \.\.\.submission\.headers\(body\) \},\s*body,/);
      assert.match(form, /submission\.done\(\);/);
    });
  }

  it('the form key is reused for the same body and replaced for a new one', () => {
    const hook = read('src/lib/submission-key.ts');
    assert.match(hook, /if \(current\.current\?\.body !== body\) current\.current = \{ body, key: randomKey\(\) \};/);
  });
});
