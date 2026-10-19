import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  pageRange,
  pageWindow,
  paginationMeta,
  parsePagination,
} from '../../src/lib/pagination';
import { paginated } from '../../src/lib/contracts/common';
import { z } from 'zod';
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

describe('pagination arithmetic holds for every combination', () => {
  const totals = [0, 1, 19, 20, 21, 39, 40, 41, 199, 200, 201, 1000];
  const limits = [1, 2, 7, 20, 50, MAX_PAGE_SIZE];

  it('the pages together cover every item exactly once', () => {
    for (const total of totals) {
      for (const limit of limits) {
        const meta = paginationMeta({ page: 1, limit }, total);
        let covered = 0;
        let previousLast = 0;
        for (let page = 1; page <= meta.total_page; page += 1) {
          const request = parsePagination(query(`page=${page}&limit=${limit}`))!;
          const size = Math.min(limit, total - request.skip);
          assert.ok(size >= 1, `page ${page} of ${meta.total_page} is empty (total ${total}, limit ${limit})`);
          const range = pageRange({ ...meta, page });
          assert.equal(range.first, previousLast + 1, 'pages must be contiguous');
          assert.equal(range.last - range.first + 1, size);
          previousLast = range.last;
          covered += size;
        }
        assert.equal(covered, total, `total ${total}, limit ${limit}`);
      }
    }
  });

  it('total_page is the smallest number of pages that fits every item', () => {
    for (const total of totals) {
      for (const limit of limits) {
        const { total_page: pages } = paginationMeta({ page: 1, limit }, total);
        assert.ok(pages * limit >= total);
        assert.ok(pages === 0 || (pages - 1) * limit < total);
      }
    }
  });

  it('a page beyond the last one is a valid request with an empty range', () => {
    const request = parsePagination(query('page=9999&limit=20'))!;
    assert.equal(request.skip, 9998 * 20);
    assert.deepEqual(pageRange(paginationMeta({ page: 1, limit: 20 }, 0)), { first: 0, last: 0 });
  });

  it('parses leading zeros and ignores empty values, but never coerces junk', () => {
    assert.deepEqual(parsePagination(query('page=02&limit=010')), { page: 2, limit: 10, skip: 10 });
    assert.deepEqual(parsePagination(query('page=&limit=')), { page: 1, limit: DEFAULT_PAGE_SIZE, skip: 0 });
    for (const junk of ['page=1e2', 'page=+1', 'page=%201', 'limit=20abc', 'limit=0x10', 'page=١']) {
      assert.equal(parsePagination(query(junk)), null, junk);
    }
  });
});

describe('pagination bar', () => {
  it('shows every page when there are few', () => {
    assert.deepEqual(pageWindow(1, 1), [1]);
    assert.deepEqual(pageWindow(2, 3), [1, 2, 3]);
  });

  it('keeps first, last, current and neighbours, with gaps in between', () => {
    assert.deepEqual(pageWindow(1, 10), [1, 2, null, 10]);
    assert.deepEqual(pageWindow(5, 10), [1, null, 4, 5, 6, null, 10]);
    assert.deepEqual(pageWindow(10, 10), [1, null, 9, 10]);
    // No gap marker when only one page would be hidden on a side.
    assert.deepEqual(pageWindow(3, 10), [1, 2, 3, 4, null, 10]);
  });

  it('never lists a page twice or out of range, and always includes the current page', () => {
    for (let total = 1; total <= 30; total += 1) {
      for (let current = 1; current <= total; current += 1) {
        const pages = pageWindow(current, total).filter((page): page is number => page !== null);
        assert.equal(new Set(pages).size, pages.length);
        assert.ok(pages.every((page) => page >= 1 && page <= total));
        assert.ok(pages.includes(current) && pages.includes(1) && pages.includes(total));
        assert.deepEqual(pages, [...pages].sort((a, b) => a - b));
      }
    }
  });

  it('labels the visible range', () => {
    assert.deepEqual(pageRange({ page: 2, limit: 20, total_item: 51, total_page: 3 }), { first: 21, last: 40 });
    assert.deepEqual(pageRange({ page: 3, limit: 20, total_item: 51, total_page: 3 }), { first: 41, last: 51 });
    assert.deepEqual(pageRange({ page: 1, limit: 20, total_item: 5, total_page: 1 }), { first: 1, last: 5 });
  });

  it('the component uses the shared helpers and hides itself when there is nothing to page', () => {
    const component = readFileSync('src/components/ui/pagination.tsx', 'utf8');
    assert.match(component, /pageWindow\(meta\.page, meta\.total_page\)/);
    assert.match(component, /pageRange\(meta\)/);
    assert.match(component, /if \(meta\.total_item === 0\) return null/);
    assert.match(component, /meta\.total_page > 1/);
    assert.match(component, /aria-current=\{page === meta\.page \? 'page' : undefined\}/);
  });
});

describe('paginated response schema', () => {
  const Page = paginated(z.object({ id: z.string() }));
  const meta = { page: 1, limit: 20, total_item: 1, total_page: 1 };

  it('accepts a list with complete metadata', () => {
    assert.ok(Page.safeParse({ success: true, data: [{ id: 'a' }], meta }).success);
    assert.ok(Page.safeParse({ success: true, data: [], meta: { ...meta, total_item: 0, total_page: 0 } }).success);
  });

  it('rejects missing, renamed or non-integer metadata', () => {
    assert.equal(Page.safeParse({ success: true, data: [] }).success, false);
    for (const field of ['page', 'limit', 'total_item', 'total_page']) {
      const partial = Object.fromEntries(Object.entries(meta).filter(([key]) => key !== field));
      assert.equal(Page.safeParse({ success: true, data: [], meta: partial }).success, false, `without ${field}`);
    }
    assert.equal(Page.safeParse({ success: true, data: [], meta: { page: 1, limit: 20, total: 1 } }).success, false);
    assert.equal(Page.safeParse({ success: true, data: [], meta: { ...meta, page: 0 } }).success, false);
    assert.equal(Page.safeParse({ success: true, data: [], meta: { ...meta, limit: MAX_PAGE_SIZE + 1 } }).success, false);
    assert.equal(Page.safeParse({ success: true, data: [], meta: { ...meta, total_item: 1.5 } }).success, false);
  });

  it('rejects a list item that does not match', () => {
    assert.equal(Page.safeParse({ success: true, data: [{ id: 1 }], meta }).success, false);
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
    assert.match(page, /(?:API_ENDPOINTS\.ORDERS|ORDER_ENDPOINTS)\.COUNTS/);
    assert.match(page, /<Pagination meta=\{meta\}/);
    assert.doesNotMatch(page, /mappedOrders\.filter\(/);
  });

  it('the settle page reads every page of the day', () => {
    const settle = readFileSync('src/app/settle/page.tsx', 'utf8');
    assert.match(settle, /page >= \(json\.meta\?\.total_page \?\? 1\)/);
    assert.doesNotMatch(settle, /toISOString\(\)\.split\('T'\)\[0\]/);
  });
});
