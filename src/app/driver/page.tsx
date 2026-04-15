'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, MapPin, CheckCircle2, Clock, ChevronRight, LogOut, Snowflake } from 'lucide-react';

// Fake driver data
const fakeDriverOrders = [
  { id: '1', code: 'DH001', customer: 'Đại lý Minh Tuấn', phone: '0909123456', address: '123 Lê Lợi, Quận 1, TP.HCM', items: 'Đá Bi 10kg × 5', total: 1100000, status: 'PENDING', time: '14:30' },
  { id: '2', code: 'DH002', customer: 'Cửa hàng Bình An', phone: '0912345678', address: '456 Trần Hưng Đạo, Quận 5, TP.HCM', items: 'Đá Viên 10kg × 4', total: 1040000, status: 'PENDING', time: '13:15' },
  { id: '3', code: 'DH003', customer: 'Siêu thị Đông Nam', phone: '0934567890', address: '789 Nguyễn Trãi, Quận 7, TP.HCM', items: 'Đá Bi 20kg × 10', total: 4000000, status: 'DELIVERED', time: '11:45' },
  { id: '4', code: 'DH004', customer: 'Tạp hóa Chị Hương', phone: '0945678901', address: '321 Phạm Văn Đồng, Thủ Đức', items: 'Đá Bi 5kg × 2', total: 240000, status: 'DELIVERED', time: '10:00' },
];

export default function DriverPage() {
  const [orders, setOrders] = useState(fakeDriverOrders);

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;

  const toggleStatus = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: o.status === 'PENDING' ? 'DELIVERED' : 'PENDING' }
          : o
      )
    );
  };

  const openMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
  };

  const callCustomer = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">IceFlow Driver</h1>
              <p className="text-xs text-slate-400">Tài xế: Anh Vinh</p>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Chờ giao</span>
          </div>
          <p className="text-2xl font-black text-white">{pendingCount}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Đã giao</span>
          </div>
          <p className="text-2xl font-black text-white">{deliveredCount}</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className={`rounded-2xl border backdrop-blur-xl overflow-hidden transition-all ${
              order.status === 'DELIVERED'
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-white/5 border-white/10'
            }`}
          >
            {/* Card Header */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                    {order.code}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">{order.customer}</h3>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                  order.status === 'DELIVERED'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {order.status === 'DELIVERED' ? 'Đã giao' : 'Chờ giao'}
                </span>
              </div>

              {/* Items */}
              <div className="flex items-center gap-2 text-slate-300 text-sm mb-3">
                <Snowflake className="h-4 w-4 text-cyan-400" />
                <span>{order.items}</span>
              </div>

              {/* Address */}
              <button
                onClick={() => openMaps(order.address)}
                className="flex items-center gap-2 text-slate-400 text-sm mb-4 hover:text-white transition-colors w-full"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="text-left flex-1">{order.address}</span>
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => callCustomer(order.phone)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
                >
                  <Phone className="h-5 w-5" />
                  Gọi điện
                </button>
                <button
                  onClick={() => openMaps(order.address)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
                >
                  <MapPin className="h-5 w-5" />
                  Chỉ đường
                </button>
              </div>
            </div>

            {/* Toggle Status Footer */}
            <button
              onClick={() => toggleStatus(order.id)}
              className={`w-full py-3 text-center font-semibold text-sm transition-colors ${
                order.status === 'DELIVERED'
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              }`}
            >
              {order.status === 'DELIVERED' ? '↩️ Hoàn tác' : '✓ Xác nhận đã giao'}
            </button>
          </div>
        ))}
      </div>

      {/* Bottom padding for mobile */}
      <div className="h-20" />
    </div>
  );
}
