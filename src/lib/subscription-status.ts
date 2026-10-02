import type { Subscription, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

type SubscriptionLike = {
  id?: string;
  factoryId?: string;
  planType: SubscriptionPlan;
  status: SubscriptionStatus;
  driverCount?: number;
  pricePerDriver?: Subscription['pricePerDriver'] | number | null;
  endDate: Date | string;
  startDate?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

// Check if subscription allows writes
export function isSubscriptionActive(sub: SubscriptionLike | null): boolean {
  if (!sub) return false;
  if (sub.status === 'CANCELLED') return false;
  if (sub.status === 'EXPIRED') return false;
  // Both TRIAL and PAID expire by endDate — a PAID subscription whose term
  // lapsed (no renewal recorded) must not stay writable.
  if (new Date() > toDate(sub.endDate)) return false;
  return true;
}

// Get days remaining in trial/active period
export function getDaysRemaining(sub: SubscriptionLike | null): number {
  if (!sub) return 0;
  const msRemaining = toDate(sub.endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
}

// Check if within 3-day warning period
export function isWithinWarningPeriod(sub: SubscriptionLike | null): boolean {
  if (!sub) return false;
  const days = getDaysRemaining(sub);
  return days <= 3 && days > 0;
}

// Check if grace period expired (for CANCELLED subscriptions)
export function isGracePeriodExpired(sub: SubscriptionLike | null): boolean {
  if (!sub) return false;
  if (sub.status !== 'CANCELLED') return false;
  return new Date() > toDate(sub.endDate);
}

// Re-export Prisma types for consumers
export type { Subscription, SubscriptionPlan, SubscriptionStatus, SubscriptionLike };
