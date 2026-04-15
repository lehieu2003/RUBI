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
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Sản lượng theo giờ</h3>
          <p className="text-sm text-slate-400">Hôm nay</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
          <BarChart3 className="h-5 w-5 text-blue-400" />
        </div>
      </div>

      {/* Chart */}
      <div className="flex h-48 items-end justify-between gap-2">
        {hourlyData.map((data, index) => {
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
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    isPeak
                      ? 'bg-gradient-to-t from-blue-600 to-violet-500'
                      : 'bg-gradient-to-t from-slate-600 to-slate-500'
                  }`}
                  style={{ height: `${Math.max(heightPercent, 8)}%` }}
                >
                  {/* Hover tooltip */}
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 hidden items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 shadow-xl group-hover:flex whitespace-nowrap">
                    <span className="text-xs text-slate-400">{data.hour}</span>
                    <span className="text-sm font-bold text-white">
                      {data.orders} đơn
                    </span>
                  </div>
                </div>
              </div>

              {/* Hour label */}
              <span className="mt-2 text-[10px] text-slate-500">
                {data.hour}
              </span>
            </div>
          );
        })}
      </div>

      {/* Peak indicator */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-xs text-slate-400">
          Giờ cao điểm: 10h-11h và 16h-17h
        </span>
      </div>
    </div>
  );
}
