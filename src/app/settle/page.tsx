'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { CheckCircle2, Clock, Truck, DollarSign, Package, Search, XCircle } from 'lucide-react';

// Types for API response
interface OrderItemWithProduct {
  id: string;
  quantity: number;
  unitPrice: unknown;
  lineTotal: unknown;
  actualQty: number | null;
  product: { id: string; name: string; sizeKg: number };
}

interface CustomerInfo {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
}

interface DriverInfo {
  id: string;
  name: string;
  phone: string | null;
}

interface OrderFromAPI {
  id: string;
  code: string;
  status: string;
  total: unknown;
  notes: string | null;
  createdAt: string;
  driverId: string | null;
  driver?: DriverInfo | null;
  customer: CustomerInfo;
  orderItems: OrderItemWithProduct[];
}

const statusConfig = {
  PENDING: { label: 'Chờ giao', color: 'bg-slate-500/20 text-slate-400' },
  SHIPPING: { label: 'Đang giao', color: 'bg-amber-500/20 text-amber-400' },
  DELIVERED: { label: 'Đã giao', color: 'bg-blue-500/20 text-blue-400' },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-emerald-500/20 text-emerald-400' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-500/20 text-red-400' },
};

export default function SettlePage() {
  const [orders, setOrders] = useState<OrderFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [reconcileOrder, setReconcileOrder] = useState<OrderFromAPI | null>(null);
  const [reconcileItems, setReconcileItems] = useState<Record<string, number>>({});
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Compute today string for default date filter
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch(`/api/orders?status=DELIVERED&date=${todayStr}`);
        if (!res.ok) throw new Error('Failed to fetch orders');
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [todayStr]);

  // Show toast message
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Map API orders to display format
  const mappedOrders = orders.map((order) => ({
    id: order.id,
    code: order.code || `DH-${order.id.slice(-6).toUpperCase()}`,
    customerName: order.customer?.name || 'Unknown',
    customerCode: order.customer?.code || '',
    driverName: order.driver?.name || order.driverId || 'Chưa giao',
    items: order.orderItems?.map((i) => `${i.product?.name || 'Unknown'} ${i.product?.sizeKg || 0}kg x ${i.quantity}`).join(', ') || '',
    total: typeof order.total === 'number' ? order.total : Number(order.total) || 0,
    status: order.status || 'PENDING',
    createdAt: order.createdAt ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--',
  }));

  const filteredOrders = mappedOrders.filter((order) => {
    if (search && !order.customerName.toLowerCase().includes(search.toLowerCase()) && !order.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingCount = orders.filter((o) => o.status === 'DELIVERED').length;
  const completedCount = orders.filter((o) => o.status === 'COMPLETED').length;

  // Open reconcile modal with order details
  const handleSettle = (order: OrderFromAPI) => {
    setReconcileOrder(order);
    // Initialize reconcileItems with ordered quantities
    const initial: Record<string, number> = {};
    order.orderItems?.forEach((item) => {
      initial[item.id] = item.actualQty ?? item.quantity;
    });
    setReconcileItems(initial);
  };

  // Submit reconciliation
  const handleReconcile = async () => {
    if (!reconcileOrder) return;
    setReconcileLoading(true);
    try {
      const items = Object.entries(reconcileItems).map(([id, actualQty]) => ({ id, actualQty }));
      const res = await fetch(`/api/orders/${reconcileOrder.id}/reconcile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Reconciliation failed');
      }
      // Refresh orders
      const ordersRes = await fetch(`/api/orders?status=DELIVERED&date=${todayStr}`);
      const ordersData = await ordersRes.json();
      setOrders(ordersData);
      setReconcileOrder(null);
      showToast('success', 'Đã chốt đơn thành công');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Reconciliation failed');
    } finally {
      setReconcileLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-slate-400">Đang tải đơn hàng...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-red-400">Lỗi: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-violet-600/10 rounded-full blur-3xl" />
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${
          toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          {toast.message}
        </div>
      )}

      <Sidebar />

      <main className="pl-64">
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">Đối soát & Chốt đơn</h1>
              <p className="text-slate-400 mt-1">
                {pendingCount} đơn chờ đối soát
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
                  <p className="text-sm text-blue-400">Chờ đối soát</p>
                  <p className="text-2xl font-black text-white">{pendingCount}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-emerald-400">Đã đối soát hôm nay</p>
                  <p className="text-2xl font-black text-white">{completedCount}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Tổng đơn hôm nay</p>
                  <p className="text-2xl font-black text-white">{orders.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên khách hoặc mã đơn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">Không có đơn hàng nào cần đối soát</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const rawOrder = orders.find(o => o.id === order.id);
                const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border backdrop-blur-xl p-5 bg-white/5 border-white/10 transition-all hover:bg-white/8"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-mono text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                            {order.code}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-white">{order.customerName}</h3>
                        <p className="text-slate-400 text-sm mt-1">{order.items}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="text-slate-500">Tài xế: <span className="text-white">{order.driverName}</span></span>
                          <span className="text-slate-500">Giờ giao: <span className="text-white">{order.createdAt}</span></span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black text-emerald-400">
                          {order.total.toLocaleString('vi-VN')}đ
                        </p>
                        {order.status === 'DELIVERED' && rawOrder && (
                          <button
                            onClick={() => handleSettle(rawOrder)}
                            className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors"
                          >
                            Chốt đơn
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Reconcile Modal */}
      {reconcileOrder && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setReconcileOrder(null)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-1">
              Chốt đơn {reconcileOrder.code || `DH-${reconcileOrder.id.slice(-6).toUpperCase()}`}
            </h3>
            <p className="text-slate-400 text-sm mb-6">{reconcileOrder.customer?.name}</p>

            {/* Line items */}
            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-slate-400 uppercase">Sản phẩm đã giao</p>
              {reconcileOrder.orderItems?.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-white font-medium">{item.product?.name || 'Sản phẩm'}</p>
                    <p className="text-slate-400 text-sm">
                      {item.product?.sizeKg || 0}kg x {item.quantity} — Đơn giá: {Number(item.unitPrice).toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={reconcileItems[item.id] ?? item.quantity}
                      onChange={(e) => setReconcileItems((prev) => ({
                        ...prev,
                        [item.id]: parseInt(e.target.value) || 0,
                      }))}
                      className="w-20 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center focus:outline-none focus:border-emerald-500/50"
                    />
                    <span className="text-slate-400">/ {item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setReconcileOrder(null)}
                className="flex-1 py-3 border border-white/20 text-slate-400 font-semibold rounded-xl hover:bg-white/5 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleReconcile}
                disabled={reconcileLoading}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-semibold rounded-xl transition-colors"
              >
                {reconcileLoading ? 'Đang chốt...' : 'Xác nhận chốt'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
