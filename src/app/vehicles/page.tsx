'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Truck, Plus, Phone, TrendingUp, DollarSign, Package } from 'lucide-react';
import { ToastContainer, useToast } from '@/components/dashboard/toast';

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  slug: string;
  isActive: boolean;
  token?: string;
}

export default function VehiclesPage() {
  const { toasts, addToast, dismissToast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', isActive: true });
  const [submitting, setSubmitting] = useState(false);
  const [newDriverToken, setNewDriverToken] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/drivers')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setDrivers(data);
        setLoading(false);
      });
  }, []);

  const handleAddDriver = async () => {
    if (!formData.name) {
      addToast({ type: 'error', title: 'Vui lòng nhập tên tài xế' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create');
      const driver = await res.json();
      setDrivers(prev => [...prev, driver]);
      setNewDriverToken(driver.token);
      setFormData({ name: '', phone: '', isActive: true });
      addToast({ type: 'success', title: 'Đã thêm tài xế mới' });
    } catch {
      addToast({ type: 'error', title: 'Lỗi', message: 'Không thể tạo tài xế' });
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewDriverToken(null);
    setFormData({ name: '', phone: '', isActive: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
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
              <h1 className="text-3xl font-black text-white">Đội xe</h1>
              <p className="text-slate-400 mt-1">{drivers.length} tài xế</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all"
            >
              <Plus className="h-5 w-5" />
              Thêm tài xế
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
                  <p className="text-sm text-blue-400">Tổng tài xế</p>
                  <p className="text-2xl font-black text-white">{drivers.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-emerald-400">Đang hoạt động</p>
                  <p className="text-2xl font-black text-white">
                    {drivers.filter(d => d.isActive).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Package className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-amber-400">Không hoạt động</p>
                  <p className="text-2xl font-black text-white">
                    {drivers.filter(d => !d.isActive).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Drivers List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <p className="text-slate-400">Chưa có tài xế nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        driver.isActive ? 'bg-emerald-500/20' : 'bg-slate-500/20'
                      }`}>
                        <Truck className={`h-6 w-6 ${
                          driver.isActive ? 'text-emerald-400' : 'text-slate-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{driver.name}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                          driver.isActive
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {driver.isActive ? 'Đang chạy' : 'Ngừng'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                    <Phone className="h-4 w-4" />
                    {driver.phone || '—'}
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Token truy cập driver</p>
                    <p className="text-xs text-slate-400 font-mono truncate">{driver.token}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Driver Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-1">Thêm tài xế mới</h3>
            <p className="text-slate-400 text-sm mb-6">Tạo tài xế mới (có thể để inactive)</p>

            {newDriverToken ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-emerald-400 mb-2">Tài xế đã được tạo!</p>
                  <p className="text-xs text-slate-400 mb-3">Token bên dưới dùng để driver đăng nhập. Hãy lưu lại!</p>
                  <div className="p-3 bg-black/20 rounded-lg">
                    <p className="text-lg font-mono text-emerald-400 break-all">{newDriverToken}</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Đã hiểu
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Tên tài xế *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                      placeholder="Nguyễn Văn A"
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
                    onClick={closeModal}
                    className="flex-1 py-3 border border-white/20 text-slate-400 font-semibold rounded-xl hover:bg-white/5 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleAddDriver}
                    disabled={submitting}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-xl transition-colors"
                  >
                    {submitting ? 'Đang lưu...' : 'Xác nhận'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
