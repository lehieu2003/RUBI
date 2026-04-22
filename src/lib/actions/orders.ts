'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

// --- Price loading action ---
export async function loadCustomerPrices(customerId: string): Promise<Record<string, number>> {
  // Fetch global prices
  const globalPrices = await prisma.globalPrice.findMany({
    where: { product: { isActive: true } },
    include: { product: true },
  });
  const globalPriceMap = new Map<string, number>();
  for (const gp of globalPrices) {
    globalPriceMap.set(gp.productId, Number(gp.pricePerUnit));
  }

  // Fetch overrides
  const overrides = await prisma.customerPriceOverride.findMany({
    where: { customerId },
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

// --- Save order action ---
const OrderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(0),
  unitPrice: z.number().min(0),
  lineTotal: z.number().min(0),
});

const SaveOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  lineItems: z
    .array(OrderItemSchema)
    .min(1, 'At least one item is required')
    .refine((items) => items.some((i) => i.quantity > 0), {
      message: 'At least one item must have quantity > 0',
    }),
});

export type SaveOrderInput = z.infer<typeof SaveOrderSchema>;

export type SaveOrderResult =
  | { success: true; order: Awaited<ReturnType<typeof saveOrderInternal>> }
  | { success: false; error: string };

async function saveOrderInternal(
  customerId: string,
  lineItems: { productId: string; quantity: number; unitPrice: number; lineTotal: number }[]
) {
  const session = await getSession();
  if (!session?.factoryId) {
    throw new Error('Factory context required');
  }
  const factoryId = session.factoryId;

  const validItems = lineItems.filter((item) => item.quantity > 0);
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
        customer: true,
        orderItems: {
          include: { product: true },
        },
      },
    });

    return order;
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
