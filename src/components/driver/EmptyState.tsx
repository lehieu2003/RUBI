'use client';

import { RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  driverName: string;
  onRefresh: () => void;
}

export default function EmptyState({ driverName, onRefresh }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {/* Truck Illustration */}
      <div className="mb-6">
        <svg
          width="120"
          height="80"
          viewBox="0 0 120 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-slate-600"
        >
          {/* Truck body */}
          <rect x="10" y="25" width="70" height="35" rx="4" fill="currentColor" opacity="0.3" />
          <rect x="10" y="25" width="70" height="35" rx="4" stroke="currentColor" strokeWidth="2" />
          {/* Truck cab */}
          <rect x="80" y="35" width="25" height="25" rx="4" fill="currentColor" opacity="0.3" />
          <rect x="80" y="35" width="25" height="25" rx="4" stroke="currentColor" strokeWidth="2" />
          {/* Window */}
          <rect x="85" y="40" width="15" height="10" rx="2" fill="currentColor" opacity="0.5" />
          {/* Wheels */}
          <circle cx="30" cy="60" r="10" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="2" />
          <circle cx="30" cy="60" r="4" fill="currentColor" opacity="0.3" />
          <circle cx="75" cy="60" r="10" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="2" />
          <circle cx="75" cy="60" r="4" fill="currentColor" opacity="0.3" />
          {/* Ice symbol */}
          <text x="40" y="48" fontSize="16" fill="currentColor" opacity="0.7">❄️</text>
        </svg>
      </div>

      {/* Message */}
      <h2 className="text-xl font-bold text-on-surface mb-2">
        Chào {driverName}
      </h2>
      <p className="text-on-surface-variant text-base mb-6 max-w-xs">
        Hiện tại anh không có đơn hàng nào cần giao.
      </p>

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        className="min-h-[44px] px-8 bg-[#004a99] hover:bg-[#00346f] text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
      >
        <RefreshCw className="h-5 w-5" />
        Làm mới
      </button>
    </div>
  );
}