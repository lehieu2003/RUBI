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
import { API_ENDPOINTS } from '@/lib/api-endpoints';

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
        const response = await fetch(API_ENDPOINTS.ADMIN.STATS);
        if (!response.ok) throw new Error('Không thể tải thống kê hệ thống');
        const json = await response.json();
        const data = json?.data !== undefined ? json.data : json;
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
      <div className="mb-6 border-b border-outline-variant pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          Tổng Quan Toàn Hệ Thống
        </h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Theo dõi tình trạng nhà máy (tenants), gói thuê bao và doanh thu toàn nền tảng.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded border border-[#ba1a1a]/30 bg-error-container/50 p-4 text-xs font-bold text-on-error-container">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng nhà máy"
          value={loading ? '...' : String(stats?.totalFactoryCount ?? 0)}
          subValue="Nhà máy đã đăng ký"
          icon={Building2}
          iconColor="text-primary-accent"
          iconBg="bg-container-high"
        />
        <StatCard
          title="Nhà máy Active"
          value={loading ? '...' : String(stats?.activeFactoryCount ?? 0)}
          subValue="Thuê bao còn hiệu lực"
          icon={Snowflake}
          iconColor="text-secondary"
          iconBg="bg-[#a0f399]/40"
        />
        <StatCard
          title="Đang dùng thử (Trial)"
          value={loading ? '...' : String(stats?.trialFactoryCount ?? 0)}
          subValue="Gói trial đang hoạt động"
          icon={Timer}
          iconColor="text-tertiary-container"
          iconBg="bg-tertiary-fixed/50"
        />
        <StatCard
          title="Hết hạn / Tạm dừng"
          value={loading ? '...' : String(stats?.expiredFactoryCount ?? 0)}
          subValue="Cần hỗ trợ hoặc gia hạn"
          icon={AlertTriangle}
          iconColor="text-error"
          iconBg="bg-error-container"
          warning={(stats?.expiredFactoryCount ?? 0) > 0}
        />
        <StatCard
          title="Tài xế đang chạy"
          value={loading ? '...' : String(stats?.activeDriverCount ?? 0)}
          subValue="Toàn hệ thống"
          icon={Truck}
          iconColor="text-primary-accent"
          iconBg="bg-container-high"
        />
        <StatCard
          title="Doanh thu dự kiến"
          value={loading ? '...' : `${formatCurrency(stats?.monthlyRevenue ?? 0)} đ`}
          subValue="Theo thuê bao active"
          icon={CreditCard}
          iconColor="text-secondary"
          iconBg="bg-[#a0f399]/40"
        />
        <StatCard
          title="Thực thu tháng này"
          value={
            loading ? '...' : `${formatCurrency(stats?.monthlyPaymentTotal ?? 0)} đ`
          }
          subValue="Đã xác nhận thanh toán"
          icon={CreditCard}
          iconColor="text-primary-accent"
          iconBg="bg-container-high"
        />
        <StatCard
          title="Sắp hết hạn"
          value={loading ? '...' : String(stats?.nearExpiryCount ?? 0)}
          subValue="Trong 7 ngày tới"
          icon={AlertTriangle}
          iconColor="text-tertiary-container"
          iconBg="bg-tertiary-fixed/50"
          warning={(stats?.nearExpiryCount ?? 0) > 0}
        />
      </div>
    </div>
  );
}
