'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/helpers';
import { stockOnHand } from '@/lib/inventory';
import { type AuditActor, describeLines, dong, recordAudit } from '@/lib/audit';
import { OrderEntryError } from '@/lib/order-entry-error';
import { IDEMPOTENCY_KEY_REUSED_MESSAGE, INVALID_IDEMPOTENCY_KEY, Idempotency } from '@/lib/idempotency';

// Order entry belongs to the office (manager and staff). Server actions are
// reachable by anyone holding a session, drivers included, so the role is
// checked here and not only by the page.
async function requireOfficeFactoryId(): Promise<string> {
  return (await requireOfficeActor()).factoryId;
}

// The same check, for an action that also records who did it.
async function requireOfficeActor(): Promise<AuditActor> {
  let session;
  try {
    session = await requireRole(['ADMIN', 'STAFF']);
  } catch (error) {
    // The helper throws the API's error response; an action reports a plain error.
    if (error instanceof Response) {
      const body = await error.json().catch(() => null);
      throw new Error(body?.error ?? 'Bạn không có quyền thực hiện thao tác này');
    }
    throw error;
  }
  if (!session.factoryId) {
    throw new Error('Tài khoản chưa được gán nhà máy');
  }
  const factoryId = session.factoryId;
  return { factoryId, userId: session.userId, userName: session.name };
}

// The customer's price for every product: its own override, else the global price.
async function customerPriceList(customerId: string, factoryId: string): Promise<Record<string, number>> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, factoryId },
    select: { id: true },
  });
  if (!customer) {
    throw new Error('Không tìm thấy khách hàng');
  }

  // Fetch global prices
  const globalPrices = await prisma.globalPrice.findMany({
    where: { product: { isActive: true, factoryId } },
    include: { product: true },
  });
  const globalPriceMap = new Map<string, number>();
  for (const gp of globalPrices) {
    globalPriceMap.set(gp.productId, Number(gp.pricePerUnit));
  }

  // Fetch overrides
  const overrides = await prisma.customerPriceOverride.findMany({
    where: { customerId, customer: { factoryId }, product: { factoryId } },
  });
  const overrideMap = new Map<string, number>();
  for (const ov of overrides) {
    overrideMap.set(ov.productId, Number(ov.pricePerUnit));
  }

  // Merge: overrides win
  const result: Record<string, number> = {};
  const allProductIds = new Set([...globalPriceMap.keys(), ...overrideMap.keys()]);
  for (const productId of allProductIds) {
    result[productId] = overrideMap.get(productId) ?? globalPriceMap.get(productId) ?? 0;
  }
  return result;
}

// --- Price loading action ---
export async function loadCustomerPrices(customerId: string): Promise<Record<string, number>> {
  const factoryId = await requireOfficeFactoryId();
  return customerPriceList(customerId, factoryId);
}

// --- Sellable stock action ---
// What can still be promised on the phone, per product: the stock on the
// books minus what open orders already took. Stock only leaves the books at
// settlement, so PENDING, SHIPPING and DELIVERED orders are subtracted here.
// Products that never had a stock record are left out: nothing is known.
/** The factory's name, address and phone, printed at the top of a delivery slip. */
export async function loadSlipFactory(): Promise<{ name: string; phone: string | null; address: string | null } | null> {
  const factoryId = await requireOfficeFactoryId();
  return prisma.factory.findUnique({
    where: { id: factoryId },
    select: { name: true, phone: true, address: true },
  });
}

export async function loadSellableStock(): Promise<Record<string, number>> {
  const factoryId = await requireOfficeFactoryId();

  const products = await prisma.product.findMany({
    where: { isActive: true, factoryId },
    select: { id: true },
  });
  const productIds = products.map((product) => product.id);

  const [onHand, openOrders] = await Promise.all([
    stockOnHand(prisma, productIds),
    prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        order: { factoryId, status: { in: ['PENDING', 'SHIPPING', 'DELIVERED'] } },
      },
      _sum: { quantity: true },
    }),
  ]);
  const reserved = new Map(openOrders.map((row) => [row.productId, row._sum.quantity ?? 0]));

  const result: Record<string, number> = {};
  for (const [productId, quantity] of onHand) {
    result[productId] = quantity - (reserved.get(productId) ?? 0);
  }
  return result;
}

// --- Save order action ---
// No price in the input: the server prices every line from the price list, so
// an edited request cannot create an order at a made-up price.
const OrderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(0),
});

const SaveOrderSchema = z.object({
  customerId: z.string().min(1, 'Vui lòng chọn khách hàng'),
  lineItems: z
    .array(OrderItemSchema)
    .min(1, 'Cần ít nhất một sản phẩm')
    .refine((items) => items.some((i) => i.quantity > 0), {
      message: 'Cần ít nhất một sản phẩm có số lượng lớn hơn 0',
    }),
  // What the driver must know at the door. The web drawer does not send it.
  notes: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
});

export type SaveOrderInput = z.infer<typeof SaveOrderSchema>;

interface SavedOrder {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  customerName: string;
}

export type SaveOrderResult =
  | { success: true; order: SavedOrder }
  // `status` is what POST /api/orders answers with: 400 or 404 for an order
  // that cannot be taken as entered, 422 (`code` IDEMPOTENCY_KEY_REUSED) for a
  // key already used for another order, 500 for anything else.
  | { success: false; error: string; status: 400 | 404 | 422 | 500; code?: string };

async function saveOrderInternal(input: SaveOrderInput, idempotencyKey: unknown): Promise<SavedOrder> {
  const actor = await requireOfficeActor();
  const factoryId = actor.factoryId;

  // The same order reaching the server twice (a resend after a lost answer)
  // is taken once: the resend gets the first order back.
  const idempotency = Idempotency.forKey(idempotencyKey, factoryId, 'POST /api/orders', input);
  if (!idempotency) {
    throw new OrderEntryError(INVALID_IDEMPOTENCY_KEY, 400);
  }
  return idempotency.runWith(
    () => takeOrder(actor, input, idempotency),
    (earlier) => {
      if (earlier === 'reused') {
        throw new OrderEntryError(IDEMPOTENCY_KEY_REUSED_MESSAGE, 422, 'IDEMPOTENCY_KEY_REUSED');
      }
      return earlier.body as unknown as SavedOrder;
    }
  );
}

async function takeOrder(
  actor: AuditActor,
  { customerId, lineItems, notes }: SaveOrderInput,
  idempotency: Idempotency
): Promise<SavedOrder> {
  const factoryId = actor.factoryId;

  const orderedItems = lineItems.filter((item) => item.quantity > 0);
  const productIds = [...new Set(orderedItems.map((item) => item.productId))];

  // Order entry is the hot path: one parallel round of checks, and only the
  // prices of the products actually ordered.
  const [customer, sellable, globalPrices, overrides] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, factoryId }, select: { id: true } }),
    prisma.product.findMany({
      where: { id: { in: productIds }, factoryId, isActive: true },
      select: { id: true, name: true, sizeKg: true },
    }),
    prisma.globalPrice.findMany({
      where: { productId: { in: productIds }, product: { factoryId } },
      select: { productId: true, pricePerUnit: true },
    }),
    prisma.customerPriceOverride.findMany({
      where: { customerId, productId: { in: productIds }, customer: { factoryId }, product: { factoryId } },
      select: { productId: true, pricePerUnit: true },
    }),
  ]);
  if (!customer) {
    throw new OrderEntryError('Không tìm thấy khách hàng', 404);
  }
  if (sellable.length !== productIds.length) {
    throw new OrderEntryError('Có sản phẩm không tồn tại hoặc đã ngừng bán', 400);
  }

  // Overrides win over the global price.
  const prices = new Map<string, number>();
  for (const row of [...globalPrices, ...overrides]) {
    prices.set(row.productId, Number(row.pricePerUnit));
  }
  // The server is the only source of prices, so a product with no price at
  // all must stop the order instead of being sold for 0.
  if (productIds.some((productId) => !prices.has(productId))) {
    throw new OrderEntryError('Có sản phẩm chưa có giá bán. Báo Quản lý cài giá trước khi lên đơn.', 400);
  }

  const validItems = orderedItems.map((item) => ({
    ...item,
    unitPrice: prices.get(item.productId)!,
  }));
  const total = validItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return prisma.$transaction(async (tx) => {
    await idempotency.begin(tx);
    const order = await tx.order.create({
      data: {
        customerId,
        status: 'PENDING',
        total: total,
        notes: notes || null,
        factoryId,
        orderItems: {
          create: validItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        customer: { select: { name: true } },
      },
    });

    const products = new Map(sellable.map((product) => [product.id, product]));
    await recordAudit(tx, actor, {
      action: 'ORDER_CREATED',
      orderId: order.id,
      customerId,
      summary: `Lên đơn: ${describeLines(validItems.map((item) => ({ ...products.get(item.productId)!, quantity: item.quantity })))}. Tổng ${dong(total)}`,
    });

    // Return a plain serializable object: Prisma Decimals cannot cross the
    // Server -> Client Component boundary.
    const saved: SavedOrder = {
      id: order.id,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      customerName: order.customer.name,
    };
    await idempotency.keep(tx, 201, { ...saved });
    return saved;
  });
}

/**
 * Takes an order. `idempotencyKey` is one random value per submission, reused
 * when that submission is sent again (POST /api/orders passes the
 * Idempotency-Key header): a resend gets the first order back.
 */
export async function saveOrder(
  input: SaveOrderInput,
  idempotencyKey?: string | null
): Promise<SaveOrderResult> {
  try {
    const parsed = SaveOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e: { message: string }) => e.message).join(', '),
        status: 400,
      };
    }

    const order = await saveOrderInternal(parsed.data, idempotencyKey);

    revalidatePath('/orders');

    return { success: true, order };
  } catch (error) {
    console.error('[saveOrder] error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to save order',
      status: error instanceof OrderEntryError ? error.status : 500,
      ...(error instanceof OrderEntryError && error.code ? { code: error.code } : {}),
    };
  }
}
