import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, paginationMeta, parsePagination } from '../../src/lib/pagination';
import { orderWhere } from '../../src/lib/order-filters';
import { PaginationMeta } from '../../src/lib/contracts/common';

const query = (text: string) => new URLSearchParams(text);

describe('pagination helpers', () => {
  it('defaults to the first page of 20', () => {
    assert.deepEqual(parsePagination(query('')), { page: 1, limit: DEFAULT_PAGE_SIZE, skip: 0 });
  });

  it('computes the offset from page and limit', () => {
    assert.deepEqual(parsePagination(query('page=3&limit=50')), { page: 3, limit: 50, skip: 100 });
  });

  it('rejects anything that is not a positive integer in range', () => {
    for (const bad of ['page=0', 'page=-1', 'page=abc', 'page=1.5', 'limit=0', `limit=${MAX_PAGE_SIZE + 1}`, 'limit=x']) {
      assert.equal(parsePagination(query(bad)), null, bad);
    }
    assert.ok(parsePagination(query(`limit=${MAX_PAGE_SIZE}`)));
  });

  it('builds the standard metadata', () => {
    assert.deepEqual(paginationMeta({ page: 2, limit: 20 }, 100), { page: 2, limit: 20, total_item: 100, total_page: 5 });
    assert.equal(paginationMeta({ page: 1, limit: 20 }, 101).total_page, 6);
    assert.equal(paginationMeta({ page: 1, limit: 20 }, 0).total_page, 0);
    assert.ok(PaginationMeta.safeParse(paginationMeta({ page: 1, limit: 20 }, 7)).success);
  });
});

describe('order filters', () => {
  it('always scopes to the factory', () => {
    assert.deepEqual(orderWhere('f1', query('')), { factoryId: 'f1' });
  });

  it('treats a date as a Vietnam calendar day, whatever the server time zone', () => {
    const where = orderWhere('f1', query('date=2026-10-10'))!;
    const range = where.createdAt as { gte: Date; lt: Date };
    assert.equal(range.gte.toISOString(), '2026-10-09T17:00:00.000Z');
    assert.equal(range.lt.toISOString(), '2026-10-10T17:00:00.000Z');
  });

  it('rejects a malformed date', () => {
    assert.equal(orderWhere('f1', query('date=10/10/2026')), null);
    assert.equal(orderWhere('f1', query('date=2026-13-45')), null);
  });

  it('filters by driver, including unassigned orders', () => {
    assert.equal(orderWhere('f1', query('driverId=unassigned'))!.driverId, null);
    assert.equal(orderWhere('f1', query('driverId=d9'))!.driverId, 'd9');
  });

  it('ignores an unknown status and can leave status out for the counters', () => {
    assert.equal(orderWhere('f1', query('status=WRONG'))!.status, undefined);
    assert.equal(orderWhere('f1', query('status=PENDING'))!.status, 'PENDING');
    assert.equal(orderWhere('f1', query('status=PENDING'), { withStatus: false })!.status, undefined);
  });

  it('searches customer name, customer code and the displayed order code', () => {
    const where = orderWhere('f1', query('q=%23DH-JI9A6Q'))!;
    assert.deepEqual((where.OR as unknown[])[2], { id: { endsWith: 'ji9a6q' } });
    assert.equal((where.OR as unknown[]).length, 3);
  });
});

describe('order list is paginated end to end', () => {
  it('the API counts, limits and orders deterministically', () => {
    const route = readFileSync('src/app/api/orders/route.ts', 'utf8');
    assert.match(route, /parsePagination\(searchParams\)/);
    assert.match(route, /prisma\.order\.count\(\{ where \}\)/);
    assert.match(route, /skip: pageRequest\.skip,\s*take: pageRequest\.limit/);
    assert.match(route, /orderBy: \[\{ createdAt: 'desc' \}, \{ id: 'desc' \}\]/);
    assert.match(route, /paginationMeta\(pageRequest, totalItem\)/);
  });

  it('the orders page asks the server for one page and for the counters', () => {
    const page = readFileSync('src/app/orders/page.tsx', 'utf8');
    assert.match(page, /params\.set\('page', String\(page\)\)/);
    assert.match(page, /API_ENDPOINTS\.ORDERS\.COUNTS/);
    assert.match(page, /<Pagination meta=\{meta\}/);
    assert.doesNotMatch(page, /mappedOrders\.filter\(/);
  });

  it('the settle page reads every page of the day', () => {
    const settle = readFileSync('src/app/settle/page.tsx', 'utf8');
    assert.match(settle, /page >= \(json\.meta\?\.total_page \?\? 1\)/);
    assert.doesNotMatch(settle, /toISOString\(\)\.split\('T'\)\[0\]/);
  });
});
