import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const routePath = join(process.cwd(), 'src/app/api/d/[token]/route.ts');

describe('driver share-link API source checks', () => {
  it('route file exists', () => {
    assert.ok(existsSync(routePath), 'src/app/api/d/[token]/route.ts must exist');
  });

  it('resolves driver by token without session auth', () => {
    const route = readFileSync(routePath, 'utf-8');
    assert.match(route, /export async function GET/);
    assert.match(route, /prismaAuth\.driver\.findUnique\(\s*\{\s*where:\s*\{\s*token/);
    assert.match(route, /driverName/);
  });

  it('returns top-level orders payload, not an envelope', () => {
    const route = readFileSync(routePath, 'utf-8');
    assert.match(route, /orders:\s*serialized/);
    assert.doesNotMatch(route, /apiSuccess/);
  });

  it('returns 404 for unknown token', () => {
    const route = readFileSync(routePath, 'utf-8');
    assert.match(route, /status:\s*404/);
  });
});
