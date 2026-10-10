import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const loginPage = readFileSync(
  join(process.cwd(), 'src/app/(auth)/login/page.tsx'),
  'utf-8',
);

describe('auth forms submit explicitly on Enter', () => {
  it('login form handles Enter via onKeyDown + requestSubmit (not implicit submission)', () => {
    assert.match(loginPage, /onKeyDown/);
    assert.match(loginPage, /requestSubmit/);
  });
});
