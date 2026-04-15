'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { CheckCircle2, Clock, Truck, DollarSign, Package, Search, Filter, ChevronDown } from 'lucide-react';

// Fake data
const fakeOrders = [
  { id: '1', code: 'DH001', customer: 'Đại lý Minh Tuấn', driver: 'Anh Vinh', items: 'Đá Bi 10kg × 5, Đá Bi 5kg × 3', total: 920000, bags: 8, cash: 900000, status: 'DELIVERING', time: '14:30' },
  { id: '2', code: 'DH002', customer: 'Cửa hàng Bình An', driver: 'Anh Hùng', items: 'Đá Viên 10kg × 4', total: 1040000, bags: 4, cash: 1000000, status: 'DELIVERING', time: '13:15' },
  { id: '3', code: 'DH003', customer: 'Siêu thị Đông Nam', driver: 'Anh Vinh', items: 'Đá Bi 20kg × 10, Đá Viên 5kg × 5', total: 4700000, bags: 15, cash: 0, status: 'PENDING', time: '11:45' },
  { id: '4', code: 'DH004', customer: 'Tạp hóa Chị Hương', driver: 'Anh Hùng', items: 'Đá Bi 5kg × 2', total: 240000, bags: 2, cash: 240000, status: 'DELIVERED', time: '10:00' },
  { id: '5', code: 'DH005', customer: 'Nhà hàng Biển Đông', driver: 'Anh Vinh', items: 'Đá Bi 10kg × 8, Đá Viên 20kg × 3', total: 3440000, bags: 11, cash: 0, status: 'DELIVERING', time: '09:30' },
];

const fakeDrivers = ['Tất cả', 'Anh Vinh', 'Anh Hùng'];

export default function SettlePage() {
  const [selectedDriver, setSelectedDriver] = useState('Tất cả');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [settlingOrder, setSettlingOrder] = useState<typeof fakeOrders[0] | null>(null);
  const [cashCollected, setCashCollected] = useState('');
  const [bagsCollected, setBagsCollected] = useState('');

  const filteredOrders = fakeOrders.filter((order) => {
    if (selectedDriver !== 'Tất cả' && order.driver !== selectedDriver) return false;
    if (selectedStatus === 'Chưa chốt' && order.status === 'DELIVERED') return false;
    if (selectedStatus === 'Đã chốt' && order.status !== 'DELIVERED') return false;
    if (search && !order.customer.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingCount = fakeOrders.filter((o) => o.status !== 'DELIVERED').length;
  const deliveredCount = fakeOrders.filter((o) => o.status === 'DELIVERED').length;

  const handleSettle = (order: typeof fakeOrders[0]) => {
    setSettlingOrder(order);
    setCashCollected(order.cash.toString());
    setBagsCollected(order.bags.toString());
  };

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
              <h1 className="text-3xl font-black text-white">Đối soát & Chốt đơn</h1>
              <p className="text-slate-400 mt-1">
                {pendingCount} đơn chưa chốt • {deliveredCount} đơn đã hoàn thành
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-blue-400">Chờ giao</p>
                  <p className="text-2xl font-black text-white">{fakeOrders.filter((o) => o.status === 'PENDING').length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-amber-400">Đang giao</p>
                  <p className="text-2xl font-black text-white">{fakeOrders.filter((o) => o.status === 'DELIVERING').length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-emerald-400">Đã chốt hôm nay</p>
                  <p className="text-2xl font-black text-white">{deliveredCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên khách..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
            >
              {fakeDrivers.map((d) => (
                <option key={d} value={d} className="bg-slate-900">{d}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="Tất cả" className="bg-slate-900">Tất cả trạng thái</option>
              <option value="Chưa chốt" className="bg-slate-900">Chưa chốt</option>
              <option value="Đã chốt" className="bg-slate-900">Đã chốt</option>
            </select>
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className={`rounded-2xl border backdrop-blur-xl p-5 transition-all ${
                  order.status === 'DELIVERED'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                        {order.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        order.status === 'DELIVERED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : order.status === 'DELIVERING'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {order.status === 'PENDING' ? 'Chờ giao' : order.status === 'DELIVERING' ? 'Đang giao' : 'Đã chốt'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{order.customer}</h3>
                    <p className="text-slate-400 text-sm mt-1">{order.items}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-slate-500">Tài xế: <span className="text-white">{order.driver}</span></span>
                      <span className="text-slate-500">Giờ giao: <span className="text-white">{order.time}</span></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-400">
                      {order.total.toLocaleString('vi-VN')}đ
                    </p>
                    <div className="flex items-center gap-3 mt-2 justify-end">
                      <span className="flex items-center gap-1 text-amber-400 text-sm">
                        <DollarSign className="h-4 w-4" />
                        {order.cash.toLocaleString('vi-VN')}đ
                      </span>
                      <span className="flex items-center gap-1 text-red-400 text-sm">
                        <Package className="h-4 w-4" />
                        {order.bags} vỏ
                      </span>
                    </div>
                    {order.status !== 'DELIVERED' && (
                      <button
                        onClick={() => handleSettle(order)}
                        className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors"
                      >
                        Chốt đơn
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Settle Modal */}
      {settlingOrder && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setSettlingOrder(null)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-1">Chốt đơn {settlingOrder.code}</h3>
            <p className="text-slate-400 text-sm mb-6">{settlingOrder.customer}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Tiền mặt thu về</label>
                <input
                  type="number"
                  value={cashCollected}
                  onChange={(e) => setCashCollected(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg focus:outline-none focus:border-emerald-500/50"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Số vỏ bao thu về</label>
                <input
                  type="number"
                  value={bagsCollected}
                  onChange={(e) => setBagsCollected(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg focus:outline-none focus:border-emerald-500/50"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSettlingOrder(null)}
                className="flex-1 py-3 border border-white/20 text-slate-400 font-semibold rounded-xl hover:bg-white/5 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setSettlingOrder(null);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
              >
                Xác nhận chốt
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
