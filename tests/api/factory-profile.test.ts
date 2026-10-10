import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const route = readFileSync('src/app/api/factory/route.ts', 'utf8');
const settingsPage = readFileSync('src/app/settings/page.tsx', 'utf8');

describe('factory profile', () => {
  it('API is ADMIN-only and scoped to the session factory', () => {
    assert.match(route, /export async function GET/);
    assert.match(route, /export async function PATCH/);
    assert.equal(route.match(/requireRole\(\['ADMIN'\]\)/g)?.length, 2);
    assert.match(route, /where: \{ id: session\.factoryId \}/);
    assert.match(route, /ProfileSchema\.safeParse/);
  });

  it('Settings loads and saves the real profile instead of hard-coded values', () => {
    assert.match(settingsPage, /API_ENDPOINTS\.FACTORY\.PROFILE/);
    assert.match(settingsPage, /onSubmit=\{handleSaveFactory\}/);
    assert.doesNotMatch(settingsPage, /defaultValue="/);
  });
});
