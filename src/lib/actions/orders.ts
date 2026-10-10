'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { stockOnHand } from '@/lib/inventory';

// Order entry belongs to the office (manager and staff). Server actions are
// reachable by anyone holding a session, drivers included, so the role is
// checked here and not only by the page.
async function requireOfficeFactoryId(): Promise<string> {
  const session = await getSession();
  if (!session?.factoryId) {
    throw new Error('Tài khoản chưa được gán nhà máy');
  }
  if (session.role !== 'ADMIN' && session.role !== 'STAFF') {
    throw new Error('Bạn không có quyền thực hiện thao tác này');
  }
  const factoryId = session.factoryId;
  return factoryId;
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
});

export type SaveOrderInput = z.infer<typeof SaveOrderSchema>;

export type SaveOrderResult =
  | {
      success: true;
      order: {
        id: string;
        status: string;
        total: number;
        createdAt: string;
        customerName: string;
      };
    }
  | { success: false; error: string };

async function saveOrderInternal(
  customerId: string,
  lineItems: { productId: string; quantity: number }[]
) {
  const factoryId = await requireOfficeFactoryId();

  const orderedItems = lineItems.filter((item) => item.quantity > 0);
  const productIds = [...new Set(orderedItems.map((item) => item.productId))];

  // Order entry is the hot path: one parallel round of checks, and only the
  // prices of the products actually ordered.
  const [customer, sellable, globalPrices, overrides] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, factoryId }, select: { id: true } }),
    prisma.product.count({
      where: { id: { in: productIds }, factoryId, isActive: true },
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
    throw new Error('Không tìm thấy khách hàng');
  }
  if (sellable !== productIds.length) {
    throw new Error('Có sản phẩm không tồn tại hoặc đã ngừng bán');
  }

  // Overrides win over the global price.
  const prices = new Map<string, number>();
  for (const row of [...globalPrices, ...overrides]) {
    prices.set(row.productId, Number(row.pricePerUnit));
  }
  // The server is the only source of prices, so a product with no price at
  // all must stop the order instead of being sold for 0.
  if (productIds.some((productId) => !prices.has(productId))) {
    throw new Error('Có sản phẩm chưa có giá bán. Báo Quản lý cài giá trước khi lên đơn.');
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
    const order = await tx.order.create({
      data: {
        customerId,
        status: 'PENDING',
        total: total,
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

    // Return a plain serializable object: Prisma Decimals cannot cross the
    // Server -> Client Component boundary.
    return {
      id: order.id,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      customerName: order.customer.name,
    };
  });
}

export async function saveOrder(
  input: SaveOrderInput
): Promise<SaveOrderResult> {
  try {
    const parsed = SaveOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e: { message: string }) => e.message).join(', '),
      };
    }

    const { customerId, lineItems } = parsed.data;
    const order = await saveOrderInternal(customerId, lineItems);

    revalidatePath('/orders');

    return { success: true, order };
  } catch (error) {
    console.error('[saveOrder] error:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to save order',
    };
  }
}
