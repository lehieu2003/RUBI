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

  const carriedOver = latest?.quantityOnHand ?? 0;
  return db.inventory.create({
    data: {
      productId,
      date: today,
      quantityOnHand: 'set' in change ? change.set : carriedOver + change.add,
    },
  });
}

/**
 * Units per product already promised to orders that are not settled yet.
 * Stock only leaves the books at settlement, so these are still counted in
 * the stock on hand.
 */
export async function reservedByOpenOrders(
  db: OrderItemDb,
  factoryId: string,
  productIds: string[]
): Promise<Map<string, number>> {
  const rows = await db.orderItem.groupBy({
    by: ['productId'],
    where: {
      productId: { in: productIds },
      order: { factoryId, status: { in: ['PENDING', 'SHIPPING', 'DELIVERED'] } },
    },
    _sum: { quantity: true },
  });
  return new Map(rows.map((row) => [row.productId, row._sum.quantity ?? 0]));
}

/** A product is running low when what can still be sold is at or below its alert level. */
export function isLowStock(sellable: number, minStock: number | null): boolean {
  return minStock !== null && sellable <= minStock;
}
