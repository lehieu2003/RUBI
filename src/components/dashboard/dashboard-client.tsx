'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { StatCard } from '@/components/dashboard/stat-card';
import { SubscriptionStatusCard } from '@/components/dashboard/subscription-status-card';
import { HourlyChart } from '@/components/dashboard/hourly-chart';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { OrderEntryDrawer } from '@/components/order/order-entry-drawer';
import {
  DollarSign,
  FileText,
  Snowflake,
  Package,
} from 'lucide-react';
import type { Customer, Product, Order, Subscription } from '@prisma/client';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

type DashboardOrder = Omit<Order, 'total'> & {
  total: string | number;
  customer: { name: string; code: string };
  orderItems: { product: { name: string; sizeKg: number }; quantity: number }[];
};

interface DashboardClientProps {
  customers: Customer[];
  products: Product[];
  orders: DashboardOrder[];
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

  // Calculate stats
  const today = new Date().toDateString();
  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === today
  );
  const todayRevenue = todayOrders.reduce(
    (sum, o) => sum + Number(o.total),
    0
  );
  const deliveredCount = todayOrders.filter((o) => o.status === 'DELIVERED').length;

  // Sample stats (would come from API in production)
  const stats = {
    revenue: {
      value: todayRevenue.toLocaleString('vi-VN') + 'đ',
      subValue: 'Hôm nay',
      trend: 'up' as const,
      trendValue: '+5% so với hôm qua',
    },
    orders: {
      value: todayOrders.length.toString(),
      subValue: `${deliveredCount} đã giao, ${todayOrders.length - deliveredCount} chờ`,
      trend: 'neutral' as const,
    },
    inventory: {
      bi: 500,
      vien: 350,
    },
    bags: {
      value: '1,200 vỏ',
      subValue: 'Đang ở khách',
      trend: 'down' as const,
      trendValue: 'Tăng cao',
      warning: true,
    },
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d]">
      <Sidebar />


      <main className="pl-64">
        <div className="p-8 max-w-[1400px]">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c2c6d3] pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">
                Bảng Điều Khiển Vận Hành
              </h1>
              <p className="text-sm text-[#424751]">
                Theo dõi tình trạng đơn hàng, tồn kho và sản lượng tức thời
              </p>
            </div>
            <div className="flex items-center gap-3">
              <OrderEntryDrawer customers={customers} products={products} />
            </div>
          </div>

          {/* Onboarding prompt for new factories with no customers */}
          {showOnboardingPrompt && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-amber-300 font-semibold">Bạn chưa có khách hàng nào.</p>
                <p className="text-amber-400/70 text-sm mt-0.5">
                  Nhập danh sách khách hàng từ file CSV để bắt đầu tạo đơn hàng nhanh chóng.
                </p>
              </div>
              <a
                href="/onboarding"
                className="ml-4 shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg text-sm transition-colors"
              >
                Nhập dữ liệu ngay
              </a>
            </div>
          )}

          {/* Tier 1: Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Doanh số hôm nay"
              value={stats.revenue.value}
              subValue={stats.revenue.subValue}
              icon={DollarSign}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-500/20"
              trend={stats.revenue.trend}
              trendValue={stats.revenue.trendValue}
            />
            <StatCard
              title="Tổng đơn hàng"
              value={stats.orders.value}
              subValue={stats.orders.subValue}
              icon={FileText}
              iconColor="text-blue-400"
              iconBg="bg-blue-500/20"
              trend={stats.orders.trend}
            />
            <StatCard
              title="Tồn kho lạnh"
              value={`${stats.inventory.bi + stats.inventory.vien} bao`}
              subValue={`Đá Bi: ${stats.inventory.bi} | Đá Viên: ${stats.inventory.vien}`}
              icon={Snowflake}
              iconColor="text-cyan-400"
              iconBg="bg-cyan-500/20"
            />
            <StatCard
              title="Vỏ bao đang ở khách"
              value={stats.bags.value}
              subValue={stats.bags.subValue}
              icon={Package}
              iconColor="text-amber-400"
              iconBg="bg-amber-500/20"
              trend={stats.bags.trend}
              trendValue={stats.bags.trendValue}
              warning={stats.bags.warning}
            />
          </div>

          {/* ADMIN Subscription Status Card (5th card, full width on lg) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="lg:col-span-1">
              <SubscriptionStatusCard
                subscription={subscriptionData.subscription}
                driverCount={subscriptionData.driverCount}
                isAdmin={currentUser?.role === 'ADMIN'}
              />
            </div>
          </div>

          {/* Tier 2: Action Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            {/* Hourly Chart - 60% */}
            <div className="lg:col-span-3">
              <HourlyChart />
            </div>

            {/* Quick Actions - 40% */}
            <div className="lg:col-span-2">
              <QuickActions customers={customers} products={products} />
            </div>
          </div>

          {/* Tier 3: Recent Orders */}
          <RecentOrders orders={orders} />
        </div>
      </main>
    </div>
  );
}
