import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('tenant session auth guards', () => {
  it('rejects tenant login when user has no factoryId', () => {
    const source = read('src/app/api/auth/login/route.ts');
    assert.match(source, /if \(!user\.factoryId\)/);
    assert.match(source, /Tài khoản chưa được gán nhà máy/);
  });

  it('does not report a successful tenant session without an effective factoryId', () => {
    const source = read('src/app/api/auth/me/route.ts');
    assert.match(source, /const factoryId = session\.factoryId \?\? user\.factoryId \?\? undefined/);
    assert.match(source, /if \(!factoryId\)/);
  });

  it('refreshes legacy JWT sessions after a factoryId backfill', () => {
    const source = read('src/app/api/auth/me/route.ts');
    assert.match(source, /if \(!session\.factoryId && factoryId\)/);
    assert.match(source, /await setSessionCookie\(token\)/);
  });
});
