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
  iconColor = 'text-[#004a99]',
  iconBg = 'bg-[#dee8ff]',
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
      ? 'text-[#1b6d24]'
      : trend === 'down'
        ? 'text-[#ba1a1a]'
        : 'text-[#737783]';

  return (
    <div
      className={`relative overflow-hidden rounded border bg-[#ffffff] p-5 transition-all duration-150 ${
        warning
          ? 'border-[#7f3700] bg-[#ffdad6]/20'
          : 'border-[#c2c6d3] hover:border-[#004a99] shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <p className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-1.5">
            {title}
          </p>

          {/* Main value (Data Mono) */}
          <p
            className={`font-mono text-2xl font-bold tracking-tight tabular-nums ${
              warning ? 'text-[#ba1a1a]' : 'text-[#0f172a]'
            }`}
          >
            {value}
          </p>

          {/* Sub value */}
          {subValue && (
            <p className="mt-1 text-xs text-[#64748b] font-medium">{subValue}</p>
          )}

          {/* Trend indicator */}
          {trend && trendValue && (
            <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              <span>{trendValue}</span>
            </div>
          )}

          {children}
        </div>

        {/* Icon */}
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded ${iconBg}`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>

      {/* Warning badge */}
      {warning && (
        <div className="mt-3 inline-flex items-center gap-1 rounded bg-[#ffdad6] px-2 py-0.5 text-[11px] font-bold text-[#93000a]">
          ⚠️ Cần kiểm tra
        </div>
      )}
    </div>
  );
}
