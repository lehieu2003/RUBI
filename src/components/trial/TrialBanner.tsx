'use client';

import { useAuth } from '@/lib/auth-provider';
import { getFactorySubscription, getDaysRemaining, isSubscriptionActive, isGracePeriodExpired } from '@/lib/subscription-status';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function TrialBanner() {
  const { user } = useAuth();
  const [bannerData, setBannerData] = useState<{
    type: 'trial' | 'expired' | 'cancelled' | 'grace' | null;
    daysRemaining: number;
  }>({ type: null, daysRemaining: 0 });

  useEffect(() => {
    if (!user?.factoryId) return;

    getFactorySubscription(user.factoryId).then(sub => {
      if (!sub || (isSubscriptionActive(sub) && sub.planType === 'PAID')) {
        setBannerData({ type: null, daysRemaining: 0 });
        return;
      }

      if (sub.status === 'CANCELLED' && isGracePeriodExpired(sub)) {
        setBannerData({ type: 'cancelled', daysRemaining: 0 });
        return;
      }

      if (sub.status === 'CANCELLED') {
        setBannerData({ type: 'grace', daysRemaining: getDaysRemaining(sub) });
        return;
      }

      if (!isSubscriptionActive(sub)) {
        setBannerData({ type: 'expired', daysRemaining: 0 });
        return;
      }

      setBannerData({ type: 'trial', daysRemaining: getDaysRemaining(sub) });
    });
  }, [user]);

  if (!bannerData.type) return null;

  const bannerStyles = {
    trial: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    expired: 'bg-red-50 border-red-400 text-red-800',
    cancelled: 'bg-orange-50 border-orange-400 text-orange-800',
    grace: 'bg-orange-50 border-orange-400 text-orange-800',
  };

  const bannerText = {
    trial: `Bạn đang dùng thử IceFlow. Còn ${bannerData.daysRemaining} ngày nữa.`,
    expired: 'Dùng thử đã hết hạn. Tài khoản chỉ có thể đọc.',
    cancelled: 'Tài khoản đã bị khóa do hết thời gian gia hạn.',
    grace: `Tài khoản đã hủy. Còn ${bannerData.daysRemaining} ngày trong giai đoạn chờ (chỉ đọc).`,
  };

  return (
    <div className={`w-full px-4 py-2 border-b ${bannerStyles[bannerData.type]}`}>
      <div className="container mx-auto flex items-center justify-between">
        <span className="text-sm font-medium">
          {bannerText[bannerData.type]}
        </span>
        {bannerData.type === 'trial' && (
          <Link
            href="/settings/billing"
            className="text-sm font-semibold underline hover:no-underline"
          >
            Nâng cấp ngay
          </Link>
        )}
      </div>
    </div>
  );
}