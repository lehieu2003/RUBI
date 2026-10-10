import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { hourInVietnam, startOfVietnamToday, todayInVietnam, vietnamDayRange } from '../../src/lib/vietnam-time';

describe('Vietnam time helpers', () => {
  it('today rolls over at 17:00 UTC', () => {
    assert.equal(todayInVietnam(new Date('2026-10-10T16:59:59Z')), '2026-10-10');
    assert.equal(todayInVietnam(new Date('2026-10-10T17:00:00Z')), '2026-10-11');
    assert.equal(hourInVietnam(new Date('2026-10-10T17:00:00Z')), 0);
    assert.equal(hourInVietnam(new Date('2026-10-10T16:59:59Z')), 23);
  });

  it('a day runs from 00:00 to 00:00 Vietnam time, end exclusive', () => {
    const day = vietnamDayRange('2026-10-10')!;
    assert.equal(day.start.toISOString(), '2026-10-09T17:00:00.000Z');
    assert.equal(day.end.toISOString(), '2026-10-10T17:00:00.000Z');
    assert.equal(day.end.getTime() - day.start.getTime(), 24 * 60 * 60 * 1000);
  });

  it('consecutive days share a boundary, so no instant falls in two days or in none', () => {
    const first = vietnamDayRange('2026-12-31')!;
    const second = vietnamDayRange('2027-01-01')!;
    assert.equal(first.end.getTime(), second.start.getTime());
  });

  it('rejects malformed and impossible dates instead of rolling them over', () => {
    for (const bad of ['10/10/2026', '2026-13-01', '2026-02-31', '2026-1-1', '', 'today']) {
      assert.equal(vietnamDayRange(bad), null, bad);
    }
    assert.ok(vietnamDayRange('2028-02-29'), 'a real leap day is accepted');
  });

  it('the start of today matches the day range of today', () => {
    const now = new Date('2026-10-10T20:30:00Z'); // 03:30 on the 11th in Vietnam
    assert.equal(startOfVietnamToday(now).toISOString(), '2026-10-10T17:00:00.000Z');
    assert.ok(startOfVietnamToday(now).getTime() <= now.getTime());
  });

  it('gives the same answer whatever time zone the server runs in', () => {
    const script = "const t=require('./src/lib/vietnam-time.ts'); process.stdout.write(t.vietnamDayRange('2026-10-10').start.toISOString()+' '+t.todayInVietnam(new Date('2026-10-10T18:00:00Z')))";
    const run = (zone: string) => execSync(`TZ=${zone} npx tsx -e "${script}"`, { encoding: 'utf8' });
    assert.equal(run('UTC'), '2026-10-09T17:00:00.000Z 2026-10-11');
    assert.equal(run('America/New_York'), run('UTC'));
    assert.equal(run('Asia/Ho_Chi_Minh'), run('UTC'));
  });
});

describe('the server never derives "today" from its local clock', () => {
  it('no route or server page uses setHours to find the start of a day', () => {
    const hits = execSync("grep -rnE 'setHours\\\\(0, 0, 0, 0\\\\)|setHours\\\\(23, 59' src/app src/lib || true", { encoding: 'utf8' }).trim();
    assert.equal(hits, '', 'use vietnam-time helpers: ' + hits);
  });

  it('the day-bound endpoints use the Vietnam day', () => {
    assert.match(readFileSync('src/app/api/driver/orders/route.ts', 'utf8'), /vietnamDayRange\(/);
    assert.match(readFileSync('src/app/api/inventory/route.ts', 'utf8'), /startOfVietnamToday\(\)/);
    assert.match(readFileSync('src/app/api/orders/[id]/reconcile/route.ts', 'utf8'), /startOfVietnamToday\(\)/);
    assert.match(readFileSync('src/lib/order-filters.ts', 'utf8'), /vietnamDayRange\(date\)/);
  });

  it('client code does not take the UTC date as today', () => {
    const hits = execSync("grep -rnE 'new Date\\\\(\\\\)\\\\.toISOString\\\\(\\\\)\\\\.(slice\\\\(0, 10\\\\)|split)' src/app src/components || true", { encoding: 'utf8' }).trim();
    assert.equal(hits, '', 'use the local date: ' + hits);
  });
});

describe('dashboard figures cover the whole day', () => {
  const page = readFileSync('src/app/dashboard/page.tsx', 'utf8');
  const client = readFileSync('src/components/dashboard/dashboard-client.tsx', 'utf8');

  it("loads every order of today separately from the capped recent list", () => {
    assert.match(page, /async function getTodayOrders/);
    const today = page.slice(page.indexOf('async function getTodayOrders'), page.indexOf('async function getInventoryStats'));
    assert.match(today, /createdAt: \{ gte: startOfVietnamToday\(\) \}/);
    assert.doesNotMatch(today, /take:/, 'today orders must not be capped');
  });

  it('the KPI cards and the hourly chart use that full list', () => {
    assert.match(client, /todayOrders\.reduce\(/);
    assert.match(client, /<HourlyChart orders=\{todayOrders\} \/>/);
    assert.doesNotMatch(client, /orders\.filter\(\s*\(o\) => new Date\(o\.createdAt\)\.toDateString\(\) === today/);
  });
});
