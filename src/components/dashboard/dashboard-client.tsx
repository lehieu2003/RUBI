'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { StatCard } from '@/components/dashboard/stat-card';
import { HourlyChart } from '@/components/dashboard/hourly-chart';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { OrderEntryDrawer } from '@/components/order/order-entry-drawer';
import {
  DollarSign,
  FileText,
  Snowflake,
  Package,
  CreditCard,
} from 'lucide-react';
import type { Customer, Product, Order, Subscription } from '@prisma/client';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { getDaysRemaining } from '@/lib/subscription-status';

type DashboardOrder = Omit<Order, 'total'> & {
  total: string | number;
  customer: { id?: string; name: string; code: string; address?: string; phone?: string };
  orderItems: { id?: string; product: { name: string; sizeKg: number }; quantity: number; unitPrice?: number | string; lineTotal?: number | string }[];
};

interface DashboardClientProps {
  customers: Customer[];
  products: Product[];
  orders: DashboardOrder[];
  inventoryStats?: { totalBags: number; details: string };
  totalBagsOut?: number;
  yesterdayRevenue?: number;
  currentUser: { id: string; role: string | undefined; factoryId: string | null } | null;
  showOnboardingPrompt?: boolean;
}

interface SubscriptionData {
  subscription: Subscription | null;
  driverCount: number;
}

export function DashboardClient({
  customers,
  products,
  orders: initialOrders,
  inventoryStats = { totalBags: 0, details: 'Chưa có mẻ nhập kho' },
  totalBagsOut = 0,
  yesterdayRevenue = 0,
  currentUser,
  showOnboardingPrompt = false,
}: DashboardClientProps) {
  const [orders] = useState(initialOrders);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({ subscription: null, driverCount: 0 });

  // Fetch subscription data for ADMIN users
  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && currentUser?.factoryId) {
      fetch(API_ENDPOINTS.BILLING.SUBSCRIPTION)
        .then(res => res.json())
        .then(json => {
          const data = json?.data !== undefined ? json.data : json;
          if (data?.subscription) {
            setSubscriptionData({ subscription: data.subscription, driverCount: data.driverCount ?? 0 });
          }
        })
        .catch(console.error);
    }
  }, [currentUser]);

  // Calculate real stats
  const today = new Date().toDateString();
  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === today
  );
  const todayRevenue = todayOrders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  );
  // Delivered includes completed (settled) orders; pending = still waiting
  // for a driver or on the way.
  const deliveredCount = todayOrders.filter(
    (o) => o.status === 'DELIVERED' || o.status === 'COMPLETED'
  ).length;
  const pendingCount = todayOrders.filter(
    (o) => o.status === 'PENDING' || o.status === 'SHIPPING'
  ).length;

  let revenueTrend: 'up' | 'down' | 'neutral' = 'neutral';
  let revenueTrendValue = 'Chưa có đơn';
  if (yesterdayRevenue > 0) {
    const diff = todayRevenue - yesterdayRevenue;
    const percent = Math.round((Math.abs(diff) / yesterdayRevenue) * 100);
    if (diff > 0) {
      revenueTrend = 'up';
      revenueTrendValue = `+${percent}% so với hôm qua`;
    } else if (diff < 0) {
      revenueTrend = 'down';
      revenueTrendValue = `-${percent}% so với hôm qua`;
    } else {
      revenueTrendValue = 'Bằng hôm qua';
    }
  } else if (todayRevenue > 0) {
    revenueTrend = 'up';
    revenueTrendValue = 'Tăng trưởng hôm nay';
  }

  const daysRemaining = getDaysRemaining(subscriptionData.subscription);
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7;

  const stats = {
    revenue: {
      value: todayRevenue.toLocaleString('vi-VN') + 'đ',
      subValue: 'Hôm nay',
      trend: revenueTrend,
      trendValue: revenueTrendValue,
    },
    orders: {
      value: todayOrders.length.toString(),
      subValue: `${deliveredCount} đã giao, ${pendingCount} chờ`,
      trend: 'neutral' as const,
    },
    inventory: {
      value: `${inventoryStats.totalBags.toLocaleString('vi-VN')} bao`,
      subValue: inventoryStats.details,
    },
    bags: {
      value: `${totalBagsOut.toLocaleString('vi-VN')} vỏ`,
      subValue: 'Đang ở khách',
      trend: totalBagsOut > 500 ? ('down' as const) : ('neutral' as const),
      trendValue: totalBagsOut > 500 ? 'Cần thu hồi' : 'Bình thường',
      warning: totalBagsOut > 1000,
    },
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c2c6d3] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">
                Bảng Điều Khiển Vận Hành
              </h1>
              {currentUser?.role === 'ADMIN' && subscriptionData.subscription && (
                <Link
                  href="/billing"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                    isExpiringSoon
                      ? 'bg-[#ffdcc2] text-[#7f3700] border border-[#7f3700]/30 hover:bg-[#ffdcc2]/80'
                      : 'bg-[#dee8ff] text-[#004a99] border border-[#004a99]/20 hover:bg-[#dee8ff]/80'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>
                    {subscriptionData.subscription.planType === 'PAID' ? 'Gói PRO' : 'Gói Dùng thử'}
                    {daysRemaining !== null ? ` (Còn ${daysRemaining} ngày)` : ''}
                  </span>
                </Link>
              )}
            </div>
            <p className="text-xs text-[#424751] mt-1">
              Theo dõi tình trạng đơn hàng, tồn kho và sản lượng tức thời
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OrderEntryDrawer customers={customers} products={products} />
          </div>
        </div>

        {/* Onboarding prompt for new factories with no customers */}
        {showOnboardingPrompt && (
          <div className="mb-6 rounded border border-[#ffdcc2] bg-[#ffdcc2]/40 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[#7f3700] font-bold text-sm">Bạn chưa có khách hàng nào trong hệ thống.</p>
              <p className="text-[#424751] text-xs mt-0.5">
                Nhập danh sách khách hàng từ file CSV để bắt đầu tạo đơn hàng nhanh chóng.
              </p>
            </div>
            <a
              href="/onboarding"
              className="ml-4 shrink-0 px-4 py-2 bg-[#004a99] hover:bg-[#00346f] text-white font-bold rounded text-xs transition-colors shadow-2xs"
            >
              Nhập dữ liệu ngay
            </a>
          </div>
        )}

        {/* Tier 1: 4 Core KPI Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Doanh số hôm nay"
            value={stats.revenue.value}
            subValue={stats.revenue.subValue}
            icon={DollarSign}
            iconColor="text-[#1b6d24]"
            iconBg="bg-[#a0f399]/40"
            trend={stats.revenue.trend}
            trendValue={stats.revenue.trendValue}
          />
          <StatCard
            title="Tổng đơn hàng"
            value={stats.orders.value}
            subValue={stats.orders.subValue}
            icon={FileText}
            iconColor="text-[#004a99]"
            iconBg="bg-[#dee8ff]"
            trend={stats.orders.trend}
          />
          <StatCard
            title="Tồn kho lạnh"
            value={stats.inventory.value}
            subValue={stats.inventory.subValue}
            icon={Snowflake}
            iconColor="text-[#004a99]"
            iconBg="bg-[#dee8ff]"
          />
          <StatCard
            title="Vỏ bao đang ở khách"
            value={stats.bags.value}
            subValue={stats.bags.subValue}
            icon={Package}
            iconColor="text-[#7f3700]"
            iconBg="bg-[#ffdcc2]/50"
            trend={stats.bags.trend}
            trendValue={stats.bags.trendValue}
            warning={stats.bags.warning}
          />
        </div>

        {/* Tier 2: Action Hub & Production Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Hourly Chart - 60% */}
          <div className="lg:col-span-3">
            <HourlyChart orders={orders} />
          </div>

          {/* Quick Actions Hub - 40% */}
          <div className="lg:col-span-2">
            <QuickActions
              pendingOrdersCount={pendingCount}
              totalBagsOut={totalBagsOut}
            />
          </div>
        </div>

        {/* Tier 3: Recent Orders Table */}
        <RecentOrders orders={orders} />
      </div>
    </DashboardLayout>
  );
}
