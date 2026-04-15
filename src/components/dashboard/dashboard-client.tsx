'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { StatCard } from '@/components/dashboard/stat-card';
import { HourlyChart } from '@/components/dashboard/hourly-chart';
import { RecentOrders } from '@/components/dashboard/recent-orders';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ToastContainer, useToast } from '@/components/dashboard/toast';
import { OrderEntryDrawer } from '@/components/order/order-entry-drawer';
import {
  DollarSign,
  FileText,
  Snowflake,
  Package,
} from 'lucide-react';
import type { Customer, Product, Order } from '@prisma/client';

interface DashboardClientProps {
  customers: Customer[];
  products: Product[];
  orders: (Order & {
    customer: { name: string; code: string };
    orderItems: { product: { name: string; sizeKg: number }; quantity: number }[];
  })[];
}

export function DashboardClient({
  customers,
  products,
  orders: initialOrders,
}: DashboardClientProps) {
  const [orders] = useState(initialOrders);
  const { toasts, addToast, dismissToast } = useToast();

  // Calculate stats
  const today = new Date().toDateString();
  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === today
  );
  const todayRevenue = todayOrders.reduce(
    (sum, o) => sum + (typeof o.total === 'string' ? parseFloat(o.total) : o.total),
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="pl-64 transition-all duration-300">
        <div className="relative p-8">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white">Tổng quan</h1>
            <p className="text-slate-400 mt-1">
              {new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

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

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
