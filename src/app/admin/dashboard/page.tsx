'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CreditCard,
  Snowflake,
  Timer,
  Truck,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';

interface SystemStats {
  totalFactoryCount: number;
  activeFactoryCount: number;
  trialFactoryCount: number;
  expiredFactoryCount: number;
  activeDriverCount: number;
  monthlyRevenue: number;
  monthlyPaymentTotal: number;
  nearExpiryCount: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) throw new Error('Không thể tải thống kê hệ thống');
        const data = await response.json();
        if (active) setStats(data);
      } catch (err) {
        if (active)
          setError(
            err instanceof Error ? err.message : 'Không thể tải thống kê',
          );
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <div className='mb-8'>
        <p className='text-sm font-medium text-blue-400'>Super Admin</p>
        <h1 className='mt-1 text-3xl font-black text-white'>
          Tổng quan hệ thống
        </h1>
        <p className='mt-2 text-slate-400'>
          Theo dõi tình trạng tenant, subscription và doanh thu dự kiến.
        </p>
      </div>

      {error && (
        <div className='mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300'>
          {error}
        </div>
      )}

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <StatCard
          title='Tổng tenant'
          value={loading ? '...' : String(stats?.totalFactoryCount ?? 0)}
          subValue='Nhà máy đã đăng ký'
          icon={Building2}
          iconColor='text-blue-400'
          iconBg='bg-blue-500/20'
        />
        <StatCard
          title='Tenant active'
          value={loading ? '...' : String(stats?.activeFactoryCount ?? 0)}
          subValue='Subscription còn hiệu lực'
          icon={Snowflake}
          iconColor='text-emerald-400'
          iconBg='bg-emerald-500/20'
        />
        <StatCard
          title='Đang trial'
          value={loading ? '...' : String(stats?.trialFactoryCount ?? 0)}
          subValue='Tenant trial active'
          icon={Timer}
          iconColor='text-amber-400'
          iconBg='bg-amber-500/20'
        />
        <StatCard
          title='Hết hạn/cancelled'
          value={loading ? '...' : String(stats?.expiredFactoryCount ?? 0)}
          subValue='Cần hỗ trợ hoặc gia hạn'
          icon={AlertTriangle}
          iconColor='text-red-400'
          iconBg='bg-red-500/20'
          warning={(stats?.expiredFactoryCount ?? 0) > 0}
        />
        <StatCard
          title='Tài xế active'
          value={loading ? '...' : String(stats?.activeDriverCount ?? 0)}
          subValue='Toàn hệ thống'
          icon={Truck}
          iconColor='text-cyan-400'
          iconBg='bg-cyan-500/20'
        />
        <StatCard
          title='Doanh thu dự kiến'
          value={loading ? '...' : formatCurrency(stats?.monthlyRevenue ?? 0)}
          subValue='Theo subscription active'
          icon={CreditCard}
          iconColor='text-violet-400'
          iconBg='bg-violet-500/20'
        />
        <StatCard
          title='Payment tháng này'
          value={
            loading ? '...' : formatCurrency(stats?.monthlyPaymentTotal ?? 0)
          }
          subValue='Đã ghi nhận'
          icon={CreditCard}
          iconColor='text-emerald-400'
          iconBg='bg-emerald-500/20'
        />
        <StatCard
          title='Sắp hết hạn'
          value={loading ? '...' : String(stats?.nearExpiryCount ?? 0)}
          subValue='Trong 7 ngày tới'
          icon={AlertTriangle}
          iconColor='text-orange-400'
          iconBg='bg-orange-500/20'
          warning={(stats?.nearExpiryCount ?? 0) > 0}
        />
      </div>
    </div>
  );
}
