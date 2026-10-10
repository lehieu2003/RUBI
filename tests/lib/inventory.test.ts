import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { changeStock, stockOnHand } from '../../src/lib/inventory';
import { startOfVietnamToday } from '../../src/lib/vietnam-time';

type Row = { id: string; productId: string; date: Date; quantityOnHand: number };
type Db = Parameters<typeof changeStock>[0];

/** The few inventory queries the helpers use, over an array. */
function fakeDb(rows: Row[]): Db {
  const newestFirst = (productId?: string) =>
    rows.filter((row) => !productId || row.productId === productId).sort((a, b) => b.date.getTime() - a.date.getTime());
  const inventory = {
    async findMany({ where }: { where: { productId: { in: string[] } } }) {
      const seen = new Set<string>();
      return newestFirst().filter((row) => where.productId.in.includes(row.productId) && !seen.has(row.productId) && seen.add(row.productId));
    },
    async findFirst({ where }: { where: { productId: string } }) {
      return newestFirst(where.productId)[0] ?? null;
    },
    async update({ where, data }: { where: { id: string }; data: { quantityOnHand: number | { increment: number } } }) {
      const row = rows.find((item) => item.id === where.id)!;
      row.quantityOnHand =
        typeof data.quantityOnHand === 'number' ? data.quantityOnHand : row.quantityOnHand + data.quantityOnHand.increment;
      return row;
    },
    async create({ data }: { data: Omit<Row, 'id'> }) {
      const row = { id: `row-${rows.length + 1}`, ...data };
      rows.push(row);
      return row;
    },
  };
  return { inventory } as unknown as Db;
}

const DAY = 24 * 60 * 60 * 1000;
const today = startOfVietnamToday();
const daysAgo = (days: number) => new Date(today.getTime() - days * DAY);

describe('running stock balance', () => {
  it("the first movement of a day starts from the last closing balance", async () => {
    const rows: Row[] = [{ id: 'a', productId: 'bi-5', date: daysAgo(1), quantityOnHand: 120 }];
    const row = await changeStock(fakeDb(rows), 'bi-5', { add: 50 });
    assert.equal(row.quantityOnHand, 170);
    assert.equal(row.date.getTime(), today.getTime());
    assert.equal(rows.length, 2, "yesterday's row is kept as that day's closing balance");
    assert.equal(rows[0].quantityOnHand, 120);
  });

  it('carries over across days with no movement at all', async () => {
    const rows: Row[] = [{ id: 'a', productId: 'bi-5', date: daysAgo(4), quantityOnHand: 80 }];
    assert.equal((await stockOnHand(fakeDb(rows), ['bi-5'])).get('bi-5'), 80);
    assert.equal((await changeStock(fakeDb(rows), 'bi-5', { add: -30 })).quantityOnHand, 50);
  });

  it('later movements of the same day update the same row', async () => {
    const rows: Row[] = [{ id: 'a', productId: 'bi-5', date: daysAgo(1), quantityOnHand: 100 }];
    const db = fakeDb(rows);
    await changeStock(db, 'bi-5', { add: 40 });
    await changeStock(db, 'bi-5', { add: -15 });
    assert.equal(rows.length, 2);
    assert.equal((await stockOnHand(db, ['bi-5'])).get('bi-5'), 125);
  });

  it('a delivery before any production shows as a negative balance, not a reset', async () => {
    const rows: Row[] = [];
    const db = fakeDb(rows);
    await changeStock(db, 'bi-5', { add: -20 });
    await changeStock(db, 'bi-5', { add: 100 });
    assert.equal((await stockOnHand(db, ['bi-5'])).get('bi-5'), 80);
  });

  it('a stock count replaces the balance, and the next day starts from the counted number', async () => {
    const rows: Row[] = [{ id: 'a', productId: 'bi-5', date: daysAgo(1), quantityOnHand: 100 }];
    const db = fakeDb(rows);
    assert.equal((await changeStock(db, 'bi-5', { set: 92 })).quantityOnHand, 92);
    // pretend the count happened yesterday, then move stock today
    rows[1].date = daysAgo(1);
    rows[0].date = daysAgo(2);
    assert.equal((await changeStock(db, 'bi-5', { add: 10 })).quantityOnHand, 102);
  });

  it('keeps products apart and leaves out those that never moved', async () => {
    const rows: Row[] = [
      { id: 'a', productId: 'bi-5', date: daysAgo(2), quantityOnHand: 10 },
      { id: 'b', productId: 'bi-5', date: daysAgo(1), quantityOnHand: 30 },
      { id: 'c', productId: 'vien-5', date: daysAgo(3), quantityOnHand: 7 },
    ];
    const stock = await stockOnHand(fakeDb(rows), ['bi-5', 'vien-5', 'cay-50']);
    assert.deepEqual([...stock.entries()].sort(), [['bi-5', 30], ['vien-5', 7]]);
  });
});

describe('every stock reader and writer uses the running balance', () => {
  const read = (path: string) => readFileSync(path, 'utf8');

  it('no screen or route reads only the rows of today any more', () => {
    for (const path of ['src/app/api/inventory/route.ts', 'src/app/dashboard/page.tsx', 'src/app/api/orders/[id]/reconcile/route.ts']) {
      assert.doesNotMatch(read(path), /prisma\.inventory\.|tx\.inventory\./, `${path} must go through src/lib/inventory`);
    }
    assert.match(read('src/app/api/inventory/route.ts'), /stockOnHand\(prisma,/);
    assert.match(read('src/app/dashboard/page.tsx'), /stockOnHand\(prisma,/);
  });

  it('settlement takes the delivered quantity from the balance inside its transaction', () => {
    assert.match(read('src/app/api/orders/[id]/reconcile/route.ts'), /changeStock\(tx, orderItem\.productId, \{ add: -itemInput\.actualQty \}\)/);
  });

  it('the cold-storage screen offers a stock count that sets the counted quantity', () => {
    const page = read('src/app/inventory/page.tsx');
    assert.match(page, /mode: 'SET', productId: countItem\.productId, quantity: countedQty/);
    assert.match(page, /Kiểm kho/);
  });
});
