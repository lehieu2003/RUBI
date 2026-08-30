'use client';

import { CreditCard } from 'lucide-react';
import { StatCard } from './stat-card';
import { getDaysRemaining, isSubscriptionActive, isWithinWarningPeriod } from '@/lib/subscription-status';
import type { SubscriptionLike } from '@/lib/subscription-status';

interface SubscriptionStatusCardProps {
  subscription: SubscriptionLike | null;
  driverCount: number;
  isAdmin: boolean;
}

export function SubscriptionStatusCard({ subscription, driverCount, isAdmin }: SubscriptionStatusCardProps) {
  if (!isAdmin) return null;

  const daysRemaining = getDaysRemaining(subscription);
  const isWarning = isWithinWarningPeriod(subscription);
  const isInactive = !isSubscriptionActive(subscription);
  const maxDrivers = 1 + (subscription?.driverCount ?? 0);

  const statusColor = isInactive ? 'text-[#ba1a1a]' : 'text-[#1b6d24]';
  const statusBg = isInactive ? 'bg-[#ffdad6]' : 'bg-[#dee8ff]';

  const statusText = isInactive
    ? 'Hết hạn — Chỉ đọc'
    : isWarning
    ? `Còn ${daysRemaining} ngày — Cần gia hạn`
    : 'Gói hoạt động';

  const iconColor = isWarning ? 'text-[#7f3700]' : isInactive ? 'text-[#ba1a1a]' : 'text-[#004a99]';
  const iconBg = isWarning ? 'bg-[#ffdbca]' : isInactive ? 'bg-[#ffdad6]' : 'bg-[#dee8ff]';

  return (
    <StatCard
      title="Gói Thuê Bao"
      value={subscription?.planType === 'PAID' ? 'TRẢ PHÍ (PRO)' : 'DÙNG THỬ (TRIAL)'}
      subValue={statusText}
      icon={CreditCard}
      iconColor={iconColor}
      iconBg={iconBg}
      warning={isWarning || isInactive}
    >
      {/* Driver count detail */}
      <div className="mt-3 pt-3 border-t border-[#e7eeff]">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-[#424751]">Tài xế sử dụng</span>
          <span className="data-sm text-[#00346f]">{driverCount} / {maxDrivers}</span>
        </div>
        <div className="flex justify-between text-xs font-semibold mt-1">
          <span className="text-[#424751]">Trạng thái</span>
          <span className={`font-bold ${statusColor}`}>{subscription?.status ?? 'ACTIVE'}</span>
        </div>
      </div>
    </StatCard>
  );
}

