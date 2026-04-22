import 'server-only';

import type { Subscription } from '@prisma/client';
import { prisma } from '@/lib/db';

// Get the active subscription for a factory (ADMIN user = factory)
export async function getFactorySubscription(factoryId: string): Promise<Subscription | null> {
  return prisma.subscription.findFirst({
    where: { factoryId },
    orderBy: { createdAt: 'desc' },
  });
}
