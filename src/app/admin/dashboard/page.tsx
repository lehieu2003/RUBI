'use client';
import { useState, useEffect, useCallback } from 'react';
import { Building2, Truck, Currency } from 'lucide-react';

import { TenantTable } from '@/components/admin/tenant-table';
import { StatCard } from '@/components/dashboard/stat-card';
import { toast } from '@/components/dashboard/toast';

interface SystemStats {
  activeFactoryCount: number;
  activeDriverCount: number;
  monthlyRevenue: number;
}

export default function AdminDashboardPage() {
  const [toastShown, setToastShown] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const handleError = (message: string) => {
    if (!toastShown) {
      toast({ type: 'error', title: message });
      setToastShown(true);
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        handleError('Failed to load statistics');
      }
    } catch {
      handleError('Network error - could not load statistics');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header with back navigation */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">

        {/* Page title */}
        <h1 className="text-2xl font-black text-slate-50">Quản lý thuê bao</h1>
        <p className="text-sm text-slate-400 mt-1">
          Quản lý subscription cho tất cả các nhà máy
        </p>
      </div>

      {/* System overview stat cards */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Tổng nhà máy đang hoạt động"
            value={statsLoading ? '...' : String(stats?.activeFactoryCount ?? 0)}
            subValue="Active factories"
            icon={Building2}
            iconColor="text-blue-500"
            iconBg="bg-blue-50"
          />
          <StatCard
            title="Tổng tài xế đang hoạt động"
            value={statsLoading ? '...' : String(stats?.activeDriverCount ?? 0)}
            subValue="Active drivers"
            icon={Truck}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-50"
          />
          <StatCard
            title="Doanh thu tháng này"
            value={statsLoading ? '...' : formatCurrency(stats?.monthlyRevenue ?? 0)}
            subValue="Từ subscription"
            icon={Currency}
            iconColor="text-violet-500"
            iconBg="bg-violet-50"
          />
        </div>
      </div>

      {/* Tenant table */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <TenantTable onError={handleError} />
        </div>
      </div>
    </div>
  );
}