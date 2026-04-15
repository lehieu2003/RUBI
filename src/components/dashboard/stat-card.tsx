'use client';

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  warning?: boolean;
  children?: ReactNode;
}

export function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  iconColor = 'text-blue-500',
  iconBg = 'bg-blue-50',
  trend,
  trendValue,
  warning,
  children,
}: StatCardProps) {
  const TrendIcon =
    trend === 'up'
      ? TrendingUp
      : trend === 'down'
        ? TrendingDown
        : Minus;

  const trendColor =
    trend === 'up'
      ? 'text-emerald-500'
      : trend === 'down'
        ? 'text-red-500'
        : 'text-slate-400';

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 transition-all duration-300 hover:bg-white/10 hover:shadow-lg hover:shadow-blue-500/5 ${
        warning ? 'ring-2 ring-amber-500/50' : ''
      }`}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-blue-500/10 to-violet-500/10 blur-2xl" />
      </div>

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>

          {/* Main value */}
          <p
            className={`text-2xl font-black ${warning ? 'text-amber-400' : 'text-white'}`}
          >
            {value}
          </p>

          {/* Sub value */}
          {subValue && (
            <p className="mt-1 text-sm text-slate-500">{subValue}</p>
          )}

          {/* Trend indicator */}
          {trend && trendValue && (
            <div className={`mt-2 flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}

          {/* Custom content (for detailed stats like inventory breakdown) */}
          {children}
        </div>

        {/* Icon */}
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} shadow-lg`}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>

      {/* Warning badge */}
      {warning && (
        <div className="absolute right-4 top-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-1 text-[10px] font-semibold text-amber-400">
            ⚠️ Cảnh báo
          </span>
        </div>
      )}
    </div>
  );
}
