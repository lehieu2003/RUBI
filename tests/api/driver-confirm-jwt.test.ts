import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const confirmRoute = readFileSync(
  join(process.cwd(), 'src/app/api/orders/[id]/confirm/route.ts'),
  'utf-8',
);

describe('driver confirm JWT Bearer resolution', () => {
  it('verifies the Bearer header as a JWT', () => {
    assert.match(confirmRoute, /verifyJWT\(/);
    assert.match(confirmRoute, /verifyJWT\(authHeader\.slice\(7\)\)/);
  });

  it('routes a verified JWT session to getSessionDriver()', () => {
    assert.match(confirmRoute, /bearerSession\s*\?\s*await getSessionDriver\(\)/);
  });

  it('keeps the share-token lookup for non-JWT Bearer headers', () => {
    assert.match(
      confirmRoute,
      /prismaAuth\.driver\.findUnique\(\{\s*where:\s*\{\s*token:\s*authHeader\.slice\(7\)\s*\}\s*\}\)/,
    );
  });

  it('keeps the body share-token path unchanged', () => {
    assert.match(
      confirmRoute,
      /prismaAuth\.driver\.findUnique\(\{\s*where:\s*\{\s*token:\s*bodyToken\s*\}\s*\}\)/,
    );
  });

  it('keeps the cookie-session fallback via getSessionDriver', () => {
    assert.match(confirmRoute, /async function getSessionDriver\(\)/);
    assert.match(confirmRoute, /:\s*await getSessionDriver\(\)/);
  });
});
