import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { Prisma } from '@prisma/client';
import { retryIfCancelled } from '../../src/lib/transactions';

const read = (path: string) => readFileSync(path, 'utf8');

describe('retryIfCancelled helper', () => {
  it('returns result immediately when run succeeds without error', async () => {
    let runs = 0;
    const result = await retryIfCancelled(async () => {
      runs++;
      return 'ok';
    });
    assert.equal(result, 'ok');
    assert.equal(runs, 1);
  });

  it('retries when Prisma throws P2034 (serialization failure) and succeeds', async () => {
    let attempts = 0;
    const result = await retryIfCancelled(async () => {
      attempts++;
      if (attempts === 1) {
        throw new Prisma.PrismaClientKnownRequestError('Serialization failure', {
          code: 'P2034',
          clientVersion: '5.x',
        });
      }
      return 'success after retry';
    });
    assert.equal(result, 'success after retry');
    assert.equal(attempts, 2);
  });

  it('fails immediately when error is not P2034', async () => {
    let attempts = 0;
    await assert.rejects(
      () =>
        retryIfCancelled(async () => {
          attempts++;
          throw new Prisma.PrismaClientKnownRequestError('Foreign key violation', {
            code: 'P2003',
            clientVersion: '5.x',
          });
        }),
      (err: Error) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003'
    );
    assert.equal(attempts, 1);
  });

  it('throws when maxAttempts is reached on repeated P2034', async () => {
    let attempts = 0;
    await assert.rejects(
      () =>
        retryIfCancelled(async () => {
          attempts++;
          throw new Prisma.PrismaClientKnownRequestError('Serialization failure', {
            code: 'P2034',
            clientVersion: '5.x',
          });
        }, 3),
      (err: Error) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034'
    );
    assert.equal(attempts, 3);
  });
});

describe('inventory and reconcile concurrency isolation (RACE-1)', () => {
  it('POST /api/inventory runs under Serializable transaction with retryIfCancelled', () => {
    const route = read('src/app/api/inventory/route.ts');
    assert.match(route, /retryIfCancelled\(\(\) =>/);
    assert.match(route, /isolationLevel: 'Serializable'/);
  });

  it('PATCH /api/orders/[id]/reconcile runs under Serializable transaction with retryIfCancelled', () => {
    const route = read('src/app/api/orders/[id]/reconcile/route.ts');
    assert.match(route, /retryIfCancelled\(\(\) =>/);
    assert.match(route, /isolationLevel: 'Serializable'/);
  });
});
