import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync('src/app/vehicles/page.tsx', 'utf8');

describe('vehicles page source checks', () => {
  it('is read-only and sends driver creation to staff management', () => {
    assert.doesNotMatch(source, /fetch\('\/api\/drivers', \{\s*method: 'POST'/);
    assert.doesNotMatch(source, /Thêm tài xế/);
    assert.match(source, /Quản lý nhân sự/);
    assert.match(source, /Tạo account role Tài xế/);
  });
});
