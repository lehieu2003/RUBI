import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const registerPage = readFileSync(
  join(process.cwd(), 'src/app/(auth)/register/page.tsx'),
  'utf-8',
);

describe('register page source checks', () => {
  it('refreshes auth-provider session via signUp after registering', () => {
    assert.match(registerPage, /useAuth\(\)/);
    assert.match(registerPage, /signUp\(/);
  });

  it('does not POST the register endpoint with a private fetch (skips session refresh)', () => {
    assert.doesNotMatch(registerPage, /fetch\(API_ENDPOINTS\.AUTH\.REGISTER/);
  });
});
