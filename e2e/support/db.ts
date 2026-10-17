import { PrismaClient } from '@prisma/client';
import { DATABASE_URL } from './env';

// Direct access to the test database, for arranging a situation the screens
// cannot produce (an order taken yesterday) and for checking what was stored.
export const db = new PrismaClient({ datasourceUrl: DATABASE_URL });

const DAY_MS = 24 * 60 * 60 * 1000;

/** The Vietnam calendar day that started `daysAgo` days before today's. */
export function vietnamDayStart(daysAgo = 0): Date {
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return new Date(new Date(`${today}T00:00:00+07:00`).getTime() - daysAgo * DAY_MS);
}

/** Stock on hand of a product: its newest inventory row. */
export async function stockOf(productId: string): Promise<number | null> {
  const row = await db.inventory.findFirst({ where: { productId }, orderBy: { date: 'desc' } });
  return row?.quantityOnHand ?? null;
}

/** Replaces the stock records of a product with one closing balance dated `daysAgo` days back. */
export async function setStock(productId: string, quantity: number, daysAgo = 0): Promise<void> {
  await db.inventory.deleteMany({ where: { productId } });
  await db.inventory.create({ data: { productId, date: vietnamDayStart(daysAgo), quantityOnHand: quantity } });
}

/** Units of a product on orders that are not settled yet. */
export async function openQuantityOf(productId: string): Promise<number> {
  const sum = await db.orderItem.aggregate({
    where: { productId, order: { status: { in: ['PENDING', 'SHIPPING', 'DELIVERED'] } } },
    _sum: { quantity: true },
  });
  return sum._sum.quantity ?? 0;
}

/** "DH-" + the last six characters of the id, as every screen shows it. */
export const orderCode = (id: string) => `DH-${id.slice(-6).toUpperCase()}`;

/** A customer of the seed, by a part of its name. */
export async function customerNamed(part: string) {
  return db.customer.findFirstOrThrow({ where: { name: { contains: part } } });
}

/** A fresh PENDING order of one product, created straight in the database. */
export async function createOrder(options: {
  customerPart: string;
  productId: string;
  quantity: number;
  status?: 'PENDING' | 'SHIPPING' | 'DELIVERED';
  driverEmail?: string;
  createdDaysAgo?: number;
}) {
  const customer = await customerNamed(options.customerPart);
  const price = await db.globalPrice.findUniqueOrThrow({ where: { productId: options.productId } });
  const driver = options.driverEmail
    ? await db.driver.findFirstOrThrow({ where: { user: { email: options.driverEmail } } })
    : null;
  const unitPrice = Number(price.pricePerUnit);
  const status = options.status ?? 'PENDING';
  return db.order.create({
    data: {
      factoryId: customer.factoryId,
      customerId: customer.id,
      status,
      driverId: driver?.id ?? null,
      total: unitPrice * options.quantity,
      deliveredAt: status === 'DELIVERED' ? new Date() : null,
      createdAt: new Date(Date.now() - (options.createdDaysAgo ?? 0) * DAY_MS),
      orderItems: {
        create: [{ productId: options.productId, quantity: options.quantity, unitPrice, lineTotal: unitPrice * options.quantity }],
      },
    },
    include: { orderItems: true },
  });
}

/** Requests of the app waiting on a lock (a row, a unique key, an advisory lock) in the test database. */
export async function lockWaiters(): Promise<number> {
  const rows = await db.$queryRaw<Array<{ n: number }>>`
    SELECT count(*)::int AS n FROM pg_stat_activity
    WHERE datname = current_database() AND wait_event_type = 'Lock'`;
  return rows[0].n;
}
