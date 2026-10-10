'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import type { Customer, Product, Order } from '@prisma/client';

type DashboardOrder = Omit<Order, 'total'> & {
  total: string | number;
  customer: { id?: string; name: string; code: string; address?: string; phone?: string };
  orderItems: { id?: string; product: { name: string; sizeKg: number }; quantity: number; unitPrice?: number | string; lineTotal?: number | string }[];
};

interface DueAsset {
  assetName: string;
  assetCode: string;
  type: string;
  dueAt: string;
}

interface DashboardClientProps {
  customers: Customer[];
  products: Product[];
  orders: DashboardOrder[];
  /** Every order created today (Vietnam time), light fields only */
  todayOrders: { createdAt: Date | string; total: number; status: string }[];
  inventoryStats?: { totalBags: number; details: string };
  totalBagsOut?: number;
  yesterdayRevenue?: number;
  dueAssets: DueAsset[];
}

export function DashboardClient({
  customers,
  products,
  orders: initialOrders,
  todayOrders,
  inventoryStats = { totalBags: 0, details: 'Chưa có mẻ nhập kho' },
  totalBagsOut = 0,
  yesterdayRevenue = 0,
  dueAssets = [],
}: DashboardClientProps) {
  const [orders] = useState(initialOrders);

  // KPI figures come from every order of today (loaded separately by the
  // server), not from the capped recent-orders list.
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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">
                Bảng Điều Khiển Vận Hành
              </h1>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Theo dõi tình trạng đơn hàng, tồn kho và sản lượng tức thời
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OrderEntryDrawer customers={customers} products={products} />
          </div>
        </div>

        {/* Tier 1: 4 Core KPI Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Doanh số hôm nay"
            value={stats.revenue.value}
            subValue={stats.revenue.subValue}
            icon={DollarSign}
            iconColor="text-secondary"
            iconBg="bg-[#a0f399]/40"
            trend={stats.revenue.trend}
            trendValue={stats.revenue.trendValue}
          />
          <StatCard
            title="Tổng đơn hàng"
            value={stats.orders.value}
            subValue={stats.orders.subValue}
            icon={FileText}
            iconColor="text-primary-accent"
            iconBg="bg-container-high"
            trend={stats.orders.trend}
          />
          <StatCard
            title="Tồn kho lạnh"
            value={stats.inventory.value}
            subValue={stats.inventory.subValue}
            icon={Snowflake}
            iconColor="text-primary-accent"
            iconBg="bg-container-high"
          />
          <StatCard
            title="Vỏ bao đang ở khách"
            value={stats.bags.value}
            subValue={stats.bags.subValue}
            icon={Package}
            iconColor="text-tertiary-container"
            iconBg="bg-tertiary-fixed/50"
            trend={stats.bags.trend}
            trendValue={stats.bags.trendValue}
            warning={stats.bags.warning}
          />
        </div>

        {/* Tier 2: Action Hub & Production Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Hourly Chart - 60% */}
          <div className="lg:col-span-3">
            <HourlyChart orders={todayOrders} />
          </div>

          {/* Quick Actions Hub - 40% */}
          <div className="lg:col-span-2">
            <QuickActions
              dueAssets={dueAssets}
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
