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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-violet-600/10 rounded-full blur-3xl" />
      </div>

      <Sidebar />

      <main className="pl-64">
        <div className="relative p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white">Đội xe</h1>
              <p className="mt-1 text-slate-400">{drivers.length} tài xế từ tài khoản Nhân sự</p>
            </div>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 font-semibold text-slate-200 transition-all hover:bg-white/10 hover:text-white"
            >
              <Users className="h-5 w-5" />
              Quản lý nhân sự
            </Link>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
                  <Truck className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-blue-400">Tổng tài xế</p>
                  <p className="text-2xl font-black text-white">{drivers.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-emerald-400">Đang hoạt động</p>
                  <p className="text-2xl font-black text-white">
                    {drivers.filter((driver) => driver.isActive).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                  <Package className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-amber-400">Không hoạt động</p>
                  <p className="text-2xl font-black text-white">
                    {drivers.filter((driver) => !driver.isActive).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <p className="text-slate-400">Chưa có tài xế nào</p>
              <Link
                href="/settings"
                className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Tạo account role Tài xế
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-all hover:bg-white/10"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        driver.isActive ? 'bg-emerald-500/20' : 'bg-slate-500/20'
                      }`}>
                        <Truck className={`h-6 w-6 ${
                          driver.isActive ? 'text-emerald-400' : 'text-slate-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{driver.name}</h3>
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                          driver.isActive
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {driver.isActive ? 'Đang chạy' : 'Ngừng'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
                    <Phone className="h-4 w-4" />
                    {driver.phone || '-'}
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <p className="mb-1 text-xs text-slate-500">Token truy cập driver legacy</p>
                    <p className="truncate font-mono text-xs text-slate-400">{driver.token}</p>
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
