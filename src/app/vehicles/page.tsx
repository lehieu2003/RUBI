'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Phone, Package, TrendingUp, Truck, Users } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  isActive: boolean;
}

export default function VehiclesPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_ENDPOINTS.DRIVERS.BASE)
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        const data = json?.data !== undefined ? json.data : json;
        setDrivers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setDrivers([]);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">Đội Xe & Tài Xế</h1>
              <p className="text-xs text-on-surface-variant mt-1">{drivers.length} tài xế trong danh sách nhân sự</p>
            </div>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded border border-outline-variant bg-card px-4 py-2 text-xs font-bold text-primary-deep transition-all hover:bg-container-high shadow-sm"
            >
              <Users className="h-4 w-4" />
              QUẢN LÝ NHÂN SỰ
            </Link>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded border border-outline-variant bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-[#004a99] text-white">
                  <Truck className="h-5 w-5 text-[#9bbdff]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Tổng tài xế</p>
                  <p className="text-2xl font-bold text-on-surface">{drivers.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded border border-[#1b6d24]/30 bg-[#a0f399]/20 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1b6d24] text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-secondary uppercase">Đang hoạt động</p>
                  <p className="text-2xl font-bold text-on-surface">
                    {drivers.filter((driver) => driver.isActive).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded border border-tertiary-container/30 bg-container-high p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-[#004a99] text-white">
                  <Package className="h-5 w-5 text-[#9bbdff]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-primary-deep uppercase">Tạm ngưng</p>
                  <p className="text-2xl font-bold text-on-surface">
                    {drivers.filter((driver) => !driver.isActive).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#004a99] border-t-transparent" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="rounded border border-outline-variant bg-card p-8 text-center shadow-sm">
              <Truck className="mx-auto mb-3 h-10 w-10 text-faint" />
              <p className="text-sm font-bold text-on-surface">Chưa có tài xế nào</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Tạo tài khoản người dùng có vai trò Tài xế (DRIVER) trong phần Cài đặt &gt; Nhân sự
              </p>
              <Link
                href="/settings"
                className="mt-4 inline-flex items-center gap-2 rounded bg-[#004a99] hover:bg-[#00346f] px-4 py-2 text-xs font-bold text-white transition-colors"
              >
                <Users className="h-4 w-4" />
                Đến quản lý nhân sự
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="rounded border border-outline-variant bg-card p-5 shadow-sm hover:border-[#004a99] hover:bg-container-low transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                            driver.isActive
                              ? 'bg-[#a0f399]/40 text-secondary'
                              : 'bg-surface-dim text-on-surface-variant'
                          }`}
                        >
                          {driver.isActive ? 'Đang chạy' : 'Tạm dừng'}
                        </span>
                        <h3 className="mt-1.5 text-base font-bold text-on-surface">{driver.name}</h3>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-container-high text-primary-accent">
                        <Truck className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-outline-soft pt-3 text-xs text-on-surface-variant">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-faint" />
                        <span className="font-mono font-medium">{driver.phone || 'Chưa có SĐT'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
  );
}
