'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Phone, Package, TrendingUp, Truck, Users } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  slug: string;
  isActive: boolean;
  token?: string;
}

export default function VehiclesPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/drivers')
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        setDrivers(data);
        setLoading(false);
      })
      .catch(() => {
        setDrivers([]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d]">
      <Sidebar />

      <main className="pl-64">
        <div className="p-8 max-w-[1400px]">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c2c6d3] pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">Đội Xe & Tài Xế</h1>
              <p className="text-xs text-[#424751] mt-1">{drivers.length} tài xế trong danh sách nhân sự</p>
            </div>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded border border-[#c2c6d3] bg-white px-4 py-2 text-xs font-bold text-[#00346f] transition-all hover:bg-[#dee8ff] shadow-sm"
            >
              <Users className="h-4 w-4" />
              QUẢN LÝ NHÂN SỰ
            </Link>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded border border-[#c2c6d3] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-[#004a99] text-white">
                  <Truck className="h-5 w-5 text-[#9bbdff]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#424751] uppercase">Tổng tài xế</p>
                  <p className="text-2xl font-bold text-[#111c2d]">{drivers.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded border border-[#1b6d24]/30 bg-[#a0f399]/20 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1b6d24] text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1b6d24] uppercase">Đang hoạt động</p>
                  <p className="text-2xl font-bold text-[#111c2d]">
                    {drivers.filter((driver) => driver.isActive).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded border border-[#7f3700]/30 bg-[#dee8ff] p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-[#004a99] text-white">
                  <Package className="h-5 w-5 text-[#9bbdff]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#00346f] uppercase">Tạm ngưng</p>
                  <p className="text-2xl font-bold text-[#111c2d]">
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
            <div className="rounded border border-[#c2c6d3] bg-white p-8 text-center shadow-sm">
              <Truck className="mx-auto mb-3 h-10 w-10 text-[#737783]" />
              <p className="text-sm font-bold text-[#111c2d]">Chưa có tài xế nào</p>
              <p className="mt-1 text-xs text-[#424751]">
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
                  className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm hover:border-[#004a99] hover:bg-[#f0f3ff] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                            driver.isActive
                              ? 'bg-[#a0f399]/40 text-[#1b6d24]'
                              : 'bg-[#cfdaf2] text-[#424751]'
                          }`}
                        >
                          {driver.isActive ? 'Đang chạy' : 'Tạm dừng'}
                        </span>
                        <h3 className="mt-1.5 text-base font-bold text-[#111c2d]">{driver.name}</h3>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-[#dee8ff] text-[#004a99]">
                        <Truck className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-[#e7eeff] pt-3 text-xs text-[#424751]">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-[#737783]" />
                        <span className="font-mono font-medium">{driver.phone || 'Chưa có SĐT'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
