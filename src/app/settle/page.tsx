'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { CheckCircle2, Clock, Truck, DollarSign, Package, Search, XCircle } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

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

  // Compute today string for default date filter
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch(`${API_ENDPOINTS.ORDERS.BASE}?status=DELIVERED&date=${todayStr}`);
        if (!res.ok) throw new Error('Failed to fetch orders');
        const json = await res.json();
        const data = json?.data !== undefined ? json.data : json;
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [todayStr]);

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
      const res = await fetch(API_ENDPOINTS.ORDERS.RECONCILE(reconcileOrder.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Reconciliation failed');
      }
      // Refresh orders
      const ordersRes = await fetch(`${API_ENDPOINTS.ORDERS.BASE}?status=DELIVERED&date=${todayStr}`);
      const ordersData = await ordersRes.json();
      setOrders(ordersData);
      setReconcileOrder(null);
      toast({ type: 'success', title: 'Đã chốt đơn thành công' });
    } catch (err) {
      toast({
        type: 'error',
        title: 'Chốt đơn thất bại',
        message: err instanceof Error ? err.message : 'Reconciliation failed',
      });
    } finally {
      setReconcileLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center">
        <div className="text-[#004a99] font-bold">Đang tải đối soát...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center">
        <div className="text-[#ba1a1a] font-bold">Lỗi: {error}</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c2c6d3] pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">Đối Soát & Chốt Đơn Cuối Ca</h1>
              <p className="text-xs text-[#424751] mt-1">{pendingCount} đơn hàng đã giao cần xác nhận số lượng thực tế</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded border border-[#7f3700]/30 bg-[#dee8ff] p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-[#004a99] flex items-center justify-center text-white">
                  <Clock className="h-5 w-5 text-[#9bbdff]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#00346f] uppercase">Chờ đối soát</p>
                  <p className="data-lg font-bold text-[#111c2d]">{pendingCount}</p>
                </div>
              </div>
            </div>
            <div className="rounded border border-[#1b6d24]/30 bg-[#a0f399]/20 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-[#1b6d24] flex items-center justify-center text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1b6d24] uppercase">Đã đối soát hôm nay</p>
                  <p className="data-lg font-bold text-[#111c2d]">{completedCount}</p>
                </div>
              </div>
            </div>
            <div className="rounded border border-[#c2c6d3] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-[#e7eeff] flex items-center justify-center text-[#424751]">
                  <Package className="h-5 w-5 text-[#00346f]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#424751] uppercase">Tổng đơn trong ngày</p>
                  <p className="data-lg font-bold text-[#111c2d]">{orders.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737783]" />
              <input
                type="text"
                placeholder="Tìm theo tên khách hoặc mã đơn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#c2c6d3] rounded text-sm text-[#111c2d] placeholder-[#737783] focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99]"
              />
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded border border-[#c2c6d3]">
              <Package className="h-10 w-10 text-[#737783] mx-auto mb-2" />
              <p className="text-xs text-[#737783]">Không có đơn hàng nào cần đối soát</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const rawOrder = orders.find(o => o.id === order.id);
                const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;

                return (
                  <div
                    key={order.id}
                    className="rounded border border-[#c2c6d3] p-4 bg-white hover:bg-[#f8fafc] transition-all shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <span className="font-mono text-xs font-bold text-[#004a99] bg-[#dee8ff] px-2 py-0.5 rounded">
                            {order.code}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[#0f172a]">{order.customerName}</h3>
                        <p className="text-[#334155] text-xs font-medium mt-1">{order.items}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-[#475569]">
                          <span>Tài xế: <strong className="text-[#0f172a] font-semibold">{order.driverName}</strong></span>
                          <span>Giờ giao: <strong className="text-[#0f172a] font-mono tabular-nums">{order.createdAt}</strong></span>
                        </div>
                      </div>

                      <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                        <p className="font-mono text-lg font-bold text-[#0f172a] tabular-nums">
                          {order.total.toLocaleString('vi-VN')}đ
                        </p>
                        {order.status === 'DELIVERED' && rawOrder && (
                          <button
                            onClick={() => handleSettle(rawOrder)}
                            className="mt-2 px-4 py-2 bg-[#1b6d24] hover:bg-[#217128] text-white font-bold rounded text-xs transition-colors shadow-sm"
                          >
                            CHỐT ĐƠN
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

      {/* Reconcile Modal */}
      {reconcileOrder && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setReconcileOrder(null)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white border border-[#c2c6d3] rounded shadow-xl p-6">
            <h3 className="text-lg font-bold text-[#111c2d] mb-1">
              Chốt đơn {reconcileOrder.code || `DH-${reconcileOrder.id.slice(-6).toUpperCase()}`}
            </h3>
            <p className="text-[#424751] text-xs mb-5">{reconcileOrder.customer?.name}</p>

            {/* Line items */}
            <div className="space-y-3 mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#424751]">Số lượng thực giao</p>
              {reconcileOrder.orderItems?.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded bg-[#f9f9ff] border border-[#e7eeff]">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#111c2d]">{item.product?.name || 'Sản phẩm'}</p>
                    <p className="text-[#737783] text-[11px]">
                      {item.product?.sizeKg || 0}kg x {item.quantity} — Đơn giá: {Number(item.unitPrice).toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      value={reconcileItems[item.id] ?? item.quantity}
                      onChange={(e) => setReconcileItems((prev) => ({
                        ...prev,
                        [item.id]: parseInt(e.target.value) || 0,
                      }))}
                      className="w-16 px-2 py-1.5 bg-white border border-[#c2c6d3] rounded text-[#111c2d] text-center text-xs font-bold data-sm focus:outline-none focus:border-[#004a99]"
                    />
                    <span className="text-xs text-[#737783]">/ {item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={() => setReconcileOrder(null)}
                className="flex-1 py-2.5 border border-[#c2c6d3] text-[#424751] font-bold text-xs rounded hover:bg-[#dee8ff] transition-colors"
              >
                HỦY
              </button>
              <button
                onClick={handleReconcile}
                disabled={reconcileLoading}
                className="flex-1 py-2.5 bg-[#1b6d24] hover:bg-[#217128] disabled:bg-slate-300 text-white font-bold text-xs rounded transition-colors shadow-sm"
              >
                {reconcileLoading ? 'Đang chốt...' : 'XÁC NHẬN CHỐT'}
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
