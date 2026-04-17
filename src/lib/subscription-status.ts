import { PrismaClient } from '@prisma/client';
import type { Subscription, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Get the active subscription for a factory (ADMIN user = factory)
export async function getFactorySubscription(factoryId: string): Promise<Subscription | null> {
  return prisma.subscription.findFirst({
    where: { factoryId },
    orderBy: { createdAt: 'desc' },
  });
}

// Check if subscription allows writes
export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status === 'CANCELLED') return false;
  if (sub.status === 'EXPIRED') return false;
  if (sub.planType === 'TRIAL' && new Date() > sub.endDate) return false;
  return true;
}

// Get days remaining in trial/active period
export function getDaysRemaining(sub: Subscription | null): number {
  if (!sub) return 0;
  const msRemaining = sub.endDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
}

// Check if within 3-day warning period
export function isWithinWarningPeriod(sub: Subscription | null): boolean {
  if (!sub) return false;
  const days = getDaysRemaining(sub);
  return days <= 3 && days > 0;
}

// Check if grace period expired (for CANCELLED subscriptions)
export function isGracePeriodExpired(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status !== 'CANCELLED') return false;
  return new Date() > sub.endDate;
}

// Re-export Prisma types for consumers
export type { Subscription, SubscriptionPlan, SubscriptionStatus };