import type { prisma } from '@/lib/db';
import { startOfVietnamToday } from '@/lib/vietnam-time';

// Stock is a running balance. Each inventory row is the closing balance of one
// Vietnam day for one product; a day without movement has no row. The stock
// on hand is therefore the newest row, and the first movement of a new day
// starts from it, so yesterday's closing stock is today's opening stock.

/** The main client or the client of an open transaction. */
type InventoryDb = Pick<typeof prisma, 'inventory'>;
type OrderItemDb = Pick<typeof prisma, 'orderItem'>;

/** Add to (or, with a negative number, take from) the stock, or replace it after a stock count. */
export type StockChange = { add: number } | { set: number };

/** Stock on hand per product. A product that never had a movement is absent. */
export async function stockOnHand(db: InventoryDb, productIds: string[]): Promise<Map<string, number>> {
  const latest = await db.inventory.findMany({
    where: { productId: { in: productIds } },
    orderBy: { date: 'desc' },
    distinct: ['productId'],
    select: { productId: true, quantityOnHand: true },
  });
  return new Map(latest.map((row) => [row.productId, row.quantityOnHand]));
}

/**
 * Applies a movement to today's balance of a product, opening today's row
 * from the last closing balance when it is the first movement of the day.
 */
export async function changeStock(db: InventoryDb, productId: string, change: StockChange) {
  const today = startOfVietnamToday();
  const latest = await db.inventory.findFirst({
    where: { productId },
    orderBy: { date: 'desc' },
  });

  if (latest && latest.date >= today) {
    return db.inventory.update({
      where: { id: latest.id },
      data: { quantityOnHand: 'set' in change ? change.set : { increment: change.add } },
    });
  }

  // Another movement can open today's row at the same moment. The upsert
  // (INSERT ... ON CONFLICT) then waits for it and applies this change on
  // top, instead of failing on the unique (product, date) key.
  const carriedOver = latest?.quantityOnHand ?? 0;
  return db.inventory.upsert({
    where: { productId_date: { productId, date: today } },
    create: {
      productId,
      date: today,
      quantityOnHand: 'set' in change ? change.set : carriedOver + change.add,
    },
    update: { quantityOnHand: 'set' in change ? change.set : { increment: change.add } },
  });
}

/**
 * Units per product already promised to orders that are not settled yet.
 * Stock only leaves the books at settlement, so these are still counted in
 * the stock on hand.
 */
export function reservedByOpenOrders(db: OrderItemDb, factoryId: string, productIds: string[]) {
  return quantityOnOrders(db, factoryId, productIds, ['PENDING', 'SHIPPING', 'DELIVERED']);
}

/**
 * Units per product that have left the cold store but are still on the books:
 * on a truck (SHIPPING) or at the customer awaiting settlement (DELIVERED).
 * A stock count does not see them; PENDING orders are still in the store.
 */
export function outForDelivery(db: OrderItemDb, factoryId: string, productIds: string[]) {
  return quantityOnOrders(db, factoryId, productIds, ['SHIPPING', 'DELIVERED']);
}

async function quantityOnOrders(
  db: OrderItemDb,
  factoryId: string,
  productIds: string[],
  statuses: Array<'PENDING' | 'SHIPPING' | 'DELIVERED'>
): Promise<Map<string, number>> {
  const rows = await db.orderItem.groupBy({
    by: ['productId'],
    where: {
      productId: { in: productIds },
      order: { factoryId, status: { in: statuses } },
    },
    _sum: { quantity: true },
  });
  return new Map(rows.map((row) => [row.productId, row._sum.quantity ?? 0]));
}

/** A product is running low when what can still be sold is at or below its alert level. */
export function isLowStock(sellable: number, minStock: number | null): boolean {
  return minStock !== null && sellable <= minStock;
}
