'use client';

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';

interface OrderItem {
  quantity: number;
}

interface OrderForChart {
  createdAt: Date | string;
  total: string | number;
  orderItems?: OrderItem[];
}

interface HourlyChartProps {
  orders?: OrderForChart[];
}

interface HourlyData {
  hour: string;
  orders: number;
  revenue: number;
}

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export function HourlyChart({ orders = [] }: HourlyChartProps) {
  const hourlyData: HourlyData[] = useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(
      (o) => new Date(o.createdAt).toDateString() === today
    );

    const map = new Map<number, { orders: number; revenue: number }>();
    HOURS.forEach((h) => map.set(h, { orders: 0, revenue: 0 }));

    todayOrders.forEach((o) => {
      const orderDate = new Date(o.createdAt);
      const h = orderDate.getHours();
      if (map.has(h)) {
        const current = map.get(h)!;
        current.orders += 1;
        current.revenue += Number(o.total) || 0;
      }
    });

    return HOURS.map((h) => ({
      hour: `${h}h`,
      orders: map.get(h)?.orders ?? 0,
      revenue: map.get(h)?.revenue ?? 0,
    }));
  }, [orders]);

  const maxOrders = Math.max(...hourlyData.map((d) => d.orders), 1);
  const totalTodayOrders = hourlyData.reduce((sum, d) => sum + d.orders, 0);

  const peakHours = useMemo(() => {
    if (totalTodayOrders === 0) return null;
    const sorted = [...hourlyData].filter(d => d.orders > 0).sort((a, b) => b.orders - a.orders);
    if (sorted.length === 0) return null;
    return sorted.slice(0, 2).map(d => d.hour).join(' và ');
  }, [hourlyData, totalTodayOrders]);

  return (
    <div className="relative overflow-hidden rounded border border-outline-variant bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-on-surface">Sản Lượng Theo Khung Giờ Hôm Nay</h3>
          <p className="text-xs text-on-surface-variant">
            {totalTodayOrders > 0
              ? `Phân bổ ${totalTodayOrders} đơn hàng thực tế trong ngày`
              : 'Chưa có đơn hàng nào được tạo hôm nay'}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded bg-container-high">
          <BarChart3 className="h-5 w-5 text-primary-accent" />
        </div>
      </div>

      {/* Chart */}
      <div className="flex h-44 items-end justify-between gap-1.5 pt-4">
        {hourlyData.map((data) => {
          const heightPercent = totalTodayOrders > 0 ? (data.orders / maxOrders) * 100 : 0;
          const isPeak = totalTodayOrders > 0 && data.orders > 0 && data.orders >= maxOrders * 0.8;

          return (
            <div
              key={data.hour}
              className="group relative flex flex-1 flex-col items-center"
            >
              {/* Bar */}
              <div className="relative w-full flex items-end justify-center h-28">
                <div
                  className={`w-full rounded-t transition-all duration-150 ${
                    data.orders === 0
                      ? 'bg-container h-1'
                      : isPeak
                      ? 'bg-[#004a99] hover:bg-[#00346f]'
                      : 'bg-[#9bbdff] hover:bg-[#004a99]'
                  }`}
                  style={data.orders > 0 ? { height: `${Math.max(heightPercent, 12)}%` } : undefined}
                >
                  {/* Hover tooltip */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden items-center gap-1.5 rounded bg-[#111c2d] text-white px-2.5 py-1 shadow-lg group-hover:flex whitespace-nowrap z-10">
                    <span className="text-xs text-[#9bbdff]">{data.hour}:</span>
                    <span className="text-xs font-bold text-white">
                      {data.orders} đơn ({data.revenue.toLocaleString('vi-VN')}đ)
                    </span>
                  </div>
                </div>
              </div>

              {/* Hour label */}
              <span className="mt-2 text-[11px] text-on-surface-variant font-semibold">
                {data.hour}
              </span>
            </div>
          );
        })}
      </div>

      {/* Peak indicator */}
      <div className="mt-3 flex items-center justify-center gap-2 border-t border-outline-soft pt-3">
        <div className="h-2 w-2 rounded-full bg-[#004a99]" />
        <span className="text-xs font-medium text-on-surface-variant">
          {peakHours ? `Khung giờ cao điểm: ${peakHours}` : 'Tự động tính khung giờ cao điểm khi có đơn'}
        </span>
      </div>
    </div>
  );
}
