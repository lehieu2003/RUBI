'use client';

import { BarChart3 } from 'lucide-react';

interface HourlyData {
  hour: string;
  orders: number;
  revenue: number;
}

// Sample data - in production this would come from API
const hourlyData: HourlyData[] = [
  { hour: '6h', orders: 5, revenue: 2500000 },
  { hour: '7h', orders: 8, revenue: 4000000 },
  { hour: '8h', orders: 12, revenue: 6000000 },
  { hour: '9h', orders: 15, revenue: 7500000 },
  { hour: '10h', orders: 18, revenue: 9000000 },
  { hour: '11h', orders: 14, revenue: 7000000 },
  { hour: '12h', orders: 10, revenue: 5000000 },
  { hour: '13h', orders: 8, revenue: 4000000 },
  { hour: '14h', orders: 12, revenue: 6000000 },
  { hour: '15h', orders: 16, revenue: 8000000 },
  { hour: '16h', orders: 20, revenue: 10000000 },
  { hour: '17h', orders: 18, revenue: 9000000 },
];

export function HourlyChart() {
  const maxOrders = Math.max(...hourlyData.map((d) => d.orders));

  return (
    <div className="relative overflow-hidden rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#111c2d]">Sản Lượng Theo Khung Giờ</h3>
          <p className="text-xs text-[#424751]">Số lượng đơn hàng phân bổ trong ngày</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded bg-[#dee8ff]">
          <BarChart3 className="h-5 w-5 text-[#004a99]" />
        </div>
      </div>

      {/* Chart */}
      <div className="flex h-44 items-end justify-between gap-1.5 pt-4">
        {hourlyData.map((data) => {
          const heightPercent = (data.orders / maxOrders) * 100;
          const isPeak = data.orders >= maxOrders * 0.8;

          return (
            <div
              key={data.hour}
              className="group relative flex flex-1 flex-col items-center"
            >
              {/* Bar */}
              <div className="relative w-full">
                <div
                  className={`w-full rounded-t transition-all duration-150 ${
                    isPeak
                      ? 'bg-[#004a99] hover:bg-[#00346f]'
                      : 'bg-[#9bbdff] hover:bg-[#004a99]'
                  }`}
                  style={{ height: `${Math.max(heightPercent, 10)}%` }}
                >
                  {/* Hover tooltip */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden items-center gap-1.5 rounded bg-[#111c2d] text-white px-2.5 py-1 shadow-lg group-hover:flex whitespace-nowrap z-10">
                    <span className="data-sm text-[#9bbdff]">{data.hour}:</span>
                    <span className="data-sm font-bold text-white">
                      {data.orders} đơn
                    </span>
                  </div>
                </div>
              </div>

              {/* Hour label */}
              <span className="mt-2 data-sm text-[#424751] font-semibold">
                {data.hour}
              </span>
            </div>
          );
        })}
      </div>

      {/* Peak indicator */}
      <div className="mt-3 flex items-center justify-center gap-2 border-t border-[#e7eeff] pt-3">
        <div className="h-2 w-2 rounded-full bg-[#004a99]" />
        <span className="text-xs font-medium text-[#424751]">
          Cao điểm giao hàng: 10h-11h và 16h-17h
        </span>
      </div>
    </div>
  );
}

