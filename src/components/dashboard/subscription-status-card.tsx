'use client';

import { CreditCard } from 'lucide-react';
import { StatCard } from './stat-card';
import { getDaysRemaining, isSubscriptionActive, isWithinWarningPeriod } from '@/lib/subscription-status';
import type { Subscription } from '@prisma/client';

interface SubscriptionStatusCardProps {
  subscription: Subscription | null;
  driverCount: number;
  isAdmin: boolean;
}

export function SubscriptionStatusCard({ subscription, driverCount, isAdmin }: SubscriptionStatusCardProps) {
  if (!isAdmin) return null;

  const daysRemaining = getDaysRemaining(subscription);
  const isWarning = isWithinWarningPeriod(subscription);
  const isInactive = !isSubscriptionActive(subscription);
  const maxDrivers = 1 + (subscription?.driverCount ?? 0);

  const statusColor = isInactive ? 'text-red-400' : 'text-emerald-400';
  const statusBg = isInactive ? 'bg-red-500/20' : 'bg-emerald-500/20';

  const statusText = isInactive
    ? 'Hết hạn — Chỉ đọc'
    : isWarning
    ? `Trial còn ${daysRemaining} ngày — Liên hệ Admin để nâng cấp`
    : 'Đang hoạt động';

  const iconColor = isWarning ? 'text-amber-400' : isInactive ? 'text-red-400' : 'text-blue-400';
  const iconBg = isWarning ? 'bg-amber-500/20' : isInactive ? 'bg-red-500/20' : 'bg-blue-500/20';

  return (
    <StatCard
      title="Subscription"
      value={subscription?.planType ?? 'N/A'}
      subValue={statusText}
      icon={CreditCard}
      iconColor={iconColor}
      iconBg={iconBg}
      warning={isWarning || isInactive}
    >
      {/* Driver count detail */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Drivers</span>
          <span className="text-white font-medium">{driverCount} / {maxDrivers}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-slate-400">Loại</span>
          <span className={statusColor}>{subscription?.planType ?? 'N/A'}</span>
        </div>
      </div>
    </StatCard>
  );
}