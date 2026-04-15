'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Search, Plus, Phone, MapPin, DollarSign, Package, ChevronRight, X } from 'lucide-react';

// Fake data
const fakeCustomers = [
  { id: '1', code: 'KH001', name: 'Đại lý Minh Tuấn', phone: '0909123456', address: '123 Lê Lợi, Quận 1, TP.HCM', debt: 4500000, bagsOwed: 28 },
  { id: '2', code: 'KH002', name: 'Cửa hàng Bình An', phone: '0912345678', address: '456 Trần Hưng Đạo, Quận 5, TP.HCM', debt: 2300000, bagsOwed: 15 },
  { id: '3', code: 'KH003', name: 'Siêu thị Đông Nam', phone: '0934567890', address: '789 Nguyễn Trãi, Quận 7, TP.HCM', debt: 8900000, bagsOwed: 62 },
  { id: '4', code: 'KH004', name: 'Tạp hóa Chị Hương', phone: '0945678901', address: '321 Phạm Văn Đồng, Thủ Đức', debt: 560000, bagsOwed: 4 },
  { id: '5', code: 'KH005', name: 'Nhà hàng Biển Đông', phone: '0956789012', address: '555 Võ Văn Kiệt, Quận 8, TP.HCM', debt: 12000000, bagsOwed: 85 },
];

const fakeProducts = [
  { id: 'p1', name: 'Đá Bi', sizeKg: 5, price: 12000 },
  { id: 'p2', name: 'Đá Bi', sizeKg: 10, price: 22000 },
  { id: 'p3', name: 'Đá Bi', sizeKg: 20, price: 40000 },
  { id: 'p4', name: 'Đá Viên', sizeKg: 5, price: 14000 },
  { id: 'p5', name: 'Đá Viên', sizeKg: 10, price: 26000 },
  { id: 'p6', name: 'Đá Viên', sizeKg: 20, price: 48000 },
];

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<typeof fakeCustomers[0] | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});

  const filteredCustomers = fakeCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const handlePriceChange = (productId: string, value: string) => {
    setEditingPrices((prev) => ({ ...prev, [productId]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-violet-600/10 rounded-full blur-3xl" />
      </div>

      <Sidebar />

      <main className="pl-64">
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">Khách hàng</h1>
              <p className="text-slate-400 mt-1">{fakeCustomers.length} đại lý đang hoạt động</p>
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all">
              <Plus className="h-5 w-5" />
              Thêm khách hàng
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT hoặc mã KH..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Customer List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className="group cursor-pointer rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 hover:bg-white/10 hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                        {customer.code}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mt-1">{customer.name}</h3>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
                  <MapPin className="h-3 w-3" />
                  {customer.address}
                </div>

                <div className="flex items-center gap-4 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">
                      {customer.debt.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-semibold text-red-400">
                      {customer.bagsOwed} vỏ
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl bg-slate-900 border-l border-white/10 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-slate-900/95 backdrop-blur-xl border-b border-white/10">
              <div>
                <span className="text-xs font-mono text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                  {selectedCustomer.code}
                </span>
                <h2 className="text-xl font-bold text-white mt-1">{selectedCustomer.name}</h2>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Thông tin liên hệ</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span className="text-white">{selectedCustomer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    <span className="text-white">{selectedCustomer.address}</span>
                  </div>
                </div>
              </div>

              {/* Debt Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
                  <p className="text-sm text-amber-400 mb-1">Công nợ hiện tại</p>
                  <p className="text-2xl font-black text-amber-400">
                    {selectedCustomer.debt.toLocaleString('vi-VN')}đ
                  </p>
                </div>
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
                  <p className="text-sm text-red-400 mb-1">Vỏ bao đang nợ</p>
                  <p className="text-2xl font-black text-red-400">{selectedCustomer.bagsOwed} vỏ</p>
                </div>
              </div>

              {/* Price Overrides */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Bảng giá riêng</h3>
                <div className="space-y-3">
                  {fakeProducts.map((product) => {
                    const priceKey = `${product.id}-${product.sizeKg}`;
                    const basePrice = product.price;
                    const customPrice = editingPrices[priceKey];

                    return (
                      <div key={product.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div>
                          <span className="text-white font-medium">{product.name} {product.sizeKg}kg</span>
                          <span className="text-slate-500 text-sm ml-2">({basePrice.toLocaleString('vi-VN')}đ)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Giá mặc định"
                            value={customPrice || ''}
                            onChange={(e) => handlePriceChange(priceKey, e.target.value)}
                            className="w-28 px-3 py-1.5 bg-white/5 border border-white/20 rounded-lg text-white text-sm text-right focus:outline-none focus:border-blue-500/50"
                          />
                          <span className="text-xs text-slate-500">đ</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                  Lưu bảng giá
                </button>
              </div>

              {/* Order History */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Đơn hàng gần đây</h3>
                <div className="space-y-3">
                  {[
                    { date: '18/04/2026', items: 'Đá Bi 10kg × 5, Đá Viên 5kg × 3', total: 1820000, status: 'Đã giao' },
                    { date: '17/04/2026', items: 'Đá Bi 5kg × 10', total: 1200000, status: 'Đã giao' },
                    { date: '15/04/2026', items: 'Đá Viên 20kg × 2', total: 960000, status: 'Đã giao' },
                  ].map((order, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-white text-sm">{order.items}</p>
                        <p className="text-slate-500 text-xs">{order.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-semibold text-sm">{order.total.toLocaleString('vi-VN')}đ</p>
                        <p className="text-slate-500 text-xs">{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
