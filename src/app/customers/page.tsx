'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Search, Plus, Phone, MapPin, DollarSign, Package, ChevronRight, X } from 'lucide-react';
import { ToastContainer, useToast } from '@/components/dashboard/toast';

interface Customer {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

interface CustomerDetail extends Customer {
  debt?: number;
  bagsOwed?: number;
}

interface Product {
  id: string;
  name: string;
  sizeKg: number;
  price: number;
}

export default function CustomersPage() {
  const { toasts, addToast, dismissToast } = useToast();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', phone: '', address: '', isActive: true });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.ok ? r.json() : []),
      fetch('/api/products').then(r => r.ok ? r.json() : []),
    ]).then(([customersData, productsData]) => {
      setCustomers(customersData);
      setProducts(productsData);
      setLoading(false);
    });
  }, []);

  const handleAddCustomer = async () => {
    if (!formData.code || !formData.name) {
      addToast({ type: 'error', title: 'Vui lòng nhập mã và tên khách hàng' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create');
      const customer = await res.json();
      setCustomers(prev => [...prev, customer]);
      setIsModalOpen(false);
      setFormData({ code: '', name: '', phone: '', address: '', isActive: true });
      addToast({ type: 'success', title: 'Đã thêm khách hàng' });
    } catch {
      addToast({ type: 'error', title: 'Lỗi', message: 'Không thể tạo khách hàng' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <main className="pl-64">
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">Khách hàng</h1>
              <p className="text-slate-400 mt-1">{customers.length} khách hàng</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all"
            >
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
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
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
                        {!customer.isActive && (
                          <span className="text-xs font-mono text-slate-500 bg-slate-500/20 px-2 py-0.5 rounded">
                            inactive
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-white mt-1">{customer.name}</h3>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {customer.phone || '—'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
                    <MapPin className="h-3 w-3" />
                    {customer.address || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-1">Thêm khách hàng</h3>
            <p className="text-slate-400 text-sm mb-6">Tạo khách hàng mới (có thể để inactive)</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Mã khách hàng *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="KH001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Tên khách hàng *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="Đại lý Minh Tuấn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Số điện thoại</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="0909123456"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Địa chỉ</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                  placeholder="123 Lê Lợi, Quận 1, TP.HCM"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                />
                <label htmlFor="isActive" className="text-sm text-white">Active ngay (bỏ chọn nếu muốn tạo inactive)</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 border border-white/20 text-slate-400 font-semibold rounded-xl hover:bg-white/5 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={submitting}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-xl transition-colors"
              >
                {submitting ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </>
      )}

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
                    <span className="text-white">{selectedCustomer.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    <span className="text-white">{selectedCustomer.address || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
