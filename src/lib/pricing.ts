import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Returns Map<productId, price> for all active products
// For each product: customer override OR global base (never 0 for active products)
export async function getCustomerPriceList(
  customerId: string
): Promise<Map<string, number>> {
  // 1. Fetch all global prices into a Map
  const globalPrices = await prisma.globalPrice.findMany({
    where: { product: { isActive: true } },
    include: { product: true },
  });
  const globalPriceMap = new Map<string, number>();
  for (const gp of globalPrices) {
    globalPriceMap.set(gp.productId, Number(gp.pricePerUnit));
  }

  // 2. Fetch all customer overrides for this customer into a Map
  const overrides = await prisma.customerPriceOverride.findMany({
    where: { customerId },
  });
  const overrideMap = new Map<string, number>();
  for (const ov of overrides) {
    overrideMap.set(ov.productId, Number(ov.pricePerUnit));
  }

  // 3. Return merged map: override wins over global for same productId
  // Start with global, then apply overrides
  const result = new Map<string, number>(globalPriceMap);
  for (const [productId, price] of overrideMap) {
    result.set(productId, price);
  }

  return result;
}

// Get price for a specific product and customer
// Returns override OR global base, or 0 if neither exists
export async function getPriceForCustomer(
  productId: string,
  customerId: string
): Promise<number> {
  // Check customer override first
  const override = await prisma.customerPriceOverride.findUnique({
    where: {
      customerId_productId: { customerId, productId },
    },
  });

  if (override) {
    return Number(override.pricePerUnit);
  }

  // Fall back to global base
  const globalPrice = await prisma.globalPrice.findUnique({
    where: { productId },
  });

  if (globalPrice) {
    return Number(globalPrice.pricePerUnit);
  }

  // Edge case: neither exists — return 0 (shouldn't happen with proper seed data)
  return 0;
}

// Upsert global price — update if exists, create if not
export async function setGlobalPrice(
  productId: string,
  price: number
): Promise<void> {
  await prisma.globalPrice.upsert({
    where: { productId },
    update: {
      pricePerUnit: new Prisma.Decimal(price.toFixed(2)),
    },
    create: {
      productId,
      pricePerUnit: new Prisma.Decimal(price.toFixed(2)),
    },
  });
}

// Upsert customer price override
export async function setCustomerPriceOverride(
  customerId: string,
  productId: string,
  price: number
): Promise<void> {
  await prisma.customerPriceOverride.upsert({
    where: {
      customerId_productId: { customerId, productId },
    },
    update: {
      pricePerUnit: new Prisma.Decimal(price.toFixed(2)),
    },
    create: {
      customerId,
      productId,
      pricePerUnit: new Prisma.Decimal(price.toFixed(2)),
    },
  });
}

// Delete override (allows inheritance to kick back in)
export async function removeCustomerPriceOverride(
  customerId: string,
  productId: string
): Promise<void> {
  await prisma.customerPriceOverride.deleteMany({
    where: { customerId, productId },
  });
}