'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Truck, Plus, Phone, Package, TrendingUp, DollarSign, Settings } from 'lucide-react';

// Fake data
const fakeVehicles = [
  { id: '1', plate: '59P-1234', driver: 'Anh Vinh', phone: '0909123456', status: 'ACTIVE', todayOrders: 12, todayRevenue: 8500000 },
  { id: '2', plate: '59P-5678', driver: 'Anh Hùng', phone: '0912345678', status: 'ACTIVE', todayOrders: 8, todayRevenue: 6200000 },
  { id: '3', plate: '59P-9012', driver: 'Anh Tuấn', phone: '0934567890', status: 'MAINTENANCE', todayOrders: 0, todayRevenue: 0 },
];

const fakeExpenses = [
  { id: '1', vehicle: '59P-1234', type: 'Xăng', amount: 350000, date: '18/04/2026' },
  { id: '2', vehicle: '59P-5678', type: 'Xăng', amount: 320000, date: '18/04/2026' },
  { id: '3', vehicle: '59P-1234', type: 'Sửa chữa', amount: 1500000, date: '17/04/2026' },
  { id: '4', vehicle: '59P-5678', type: 'Xăng', amount: 380000, date: '17/04/2026' },
];

export default function VehiclesPage() {
  const [selectedTab, setSelectedTab] = useState<'fleet' | 'expenses'>('fleet');

  const totalRevenue = fakeVehicles.reduce((sum, v) => sum + v.todayRevenue, 0);
  const totalOrders = fakeVehicles.reduce((sum, v) => sum + v.todayOrders, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-violet-600/10 rounded-full blur-3xl" />
      </div>

      <Sidebar />

      <main className="pl-64">
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">Đội xe & Chi phí</h1>
              <p className="text-slate-400 mt-1">Quản lý xe và chi phí vận hành</p>
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all">
              <Plus className="h-5 w-5" />
              Thêm xe mới
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-blue-400">Tổng xe</p>
                  <p className="text-2xl font-black text-white">{fakeVehicles.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-emerald-400">Đơn hôm nay</p>
                  <p className="text-2xl font-black text-white">{totalOrders}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-amber-400">Doanh thu xe hôm nay</p>
                  <p className="text-2xl font-black text-white">{totalRevenue.toLocaleString('vi-VN')}đ</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setSelectedTab('fleet')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedTab === 'fleet'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Danh sách xe ({fakeVehicles.length})
            </button>
            <button
              onClick={() => setSelectedTab('expenses')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedTab === 'expenses'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Chi phí ({fakeExpenses.length})
            </button>
          </div>

          {selectedTab === 'fleet' ? (
            /* Fleet List */
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {fakeVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        vehicle.status === 'ACTIVE'
                          ? 'bg-emerald-500/20'
                          : 'bg-amber-500/20'
                      }`}>
                        <Truck className={`h-6 w-6 ${
                          vehicle.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{vehicle.plate}</h3>
                        <p className="text-sm text-slate-400">{vehicle.driver}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      vehicle.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {vehicle.status === 'ACTIVE' ? 'Đang chạy' : 'Bảo dưỡng'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                    <Phone className="h-4 w-4" />
                    {vehicle.phone}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Đơn hôm nay</p>
                      <p className="text-lg font-bold text-white">{vehicle.todayOrders}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 mb-1">Doanh thu</p>
                      <p className="text-lg font-bold text-emerald-400">
                        {vehicle.todayRevenue.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Expenses List */
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Biển số</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Loại chi phí</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Ngày</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Số tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {fakeExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-medium">{expense.vehicle}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          expense.type === 'Xăng'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {expense.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{expense.date}</td>
                      <td className="py-3 px-4 text-right text-amber-400 font-semibold">
                        {expense.amount.toLocaleString('vi-VN')}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
