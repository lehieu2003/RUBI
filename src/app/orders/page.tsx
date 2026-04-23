'use client';

import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { useReactToPrint } from 'react-to-print';
import { Search, Printer, FileText, Clock, Truck, CheckCircle2, Package, XCircle, TruckIcon, CheckSquare, Square, MapPin } from 'lucide-react';
import { OrderEntryDrawer } from '@/components/order/order-entry-drawer';
import { Drawer } from '@/components/ui/drawer';
import { PrintSlip } from '@/components/order/print-slip';
import type { Customer, Product } from '@prisma/client';
import { toast } from '@/components/dashboard/toast';

// Types for API response
interface OrderItemWithProduct {
  id: string;
  quantity: number;
  unitPrice: unknown;
  lineTotal: unknown;
  product: { id: string; name: string; sizeKg: number };
}

interface CustomerInfo {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
}

interface OrderFromAPI {
  id: string;
  code: string;
  status: string;
  total: unknown;
  notes: string | null;
  createdAt: string;
  driverId: string | null;
  customer: CustomerInfo;
  orderItems: OrderItemWithProduct[];
}

interface DriverFromAPI {
  id: string;
  name: string;
  phone: string | null;
}

const statusConfig = {
  PENDING: { label: 'Chờ giao', icon: Clock, color: 'text-slate-400 bg-slate-500/20' },
  SHIPPING: { label: 'Đang giao', icon: Truck, color: 'text-amber-400 bg-amber-500/20' },
  DELIVERED: { label: 'Đã giao', icon: Package, color: 'text-blue-400 bg-blue-500/20' },
  COMPLETED: { label: 'Hoàn thành', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/20' },
  CANCELLED: { label: 'Đã hủy', icon: XCircle, color: 'text-red-400 bg-red-500/20' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderFromAPI[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [drivers, setDrivers] = useState<DriverFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [filterDate, setFilterDate] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkAssignDriverId, setBulkAssignDriverId] = useState<string>('');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const printRef = useRef(null);
  const print = useReactToPrint({
    contentRef: printRef,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [ordersRes, customersRes, productsRes, driversRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/customers'),
          fetch('/api/products'),
          fetch('/api/drivers'),
        ]);

        if (!ordersRes.ok) throw new Error('Failed to fetch orders');
        if (!customersRes.ok) throw new Error('Failed to fetch customers');
        if (!productsRes.ok) throw new Error('Failed to fetch products');
        if (!driversRes.ok) throw new Error('Failed to fetch drivers');

        const [ordersData, customersData, productsData, driversData] = await Promise.all([
          ordersRes.json(),
          customersRes.json(),
          productsRes.json(),
          driversRes.json(),
        ]);

        setOrders(ordersData);
        setCustomers(customersData);
        setProducts(productsData);
        setDrivers(driversData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Map API orders to table format
  const mappedOrders = orders.map((order) => {
    const driver = drivers.find((d) => d.id === order.driverId);
    return {
      id: order.id,
      code: order.code || `DH-${order.id.slice(-6).toUpperCase()}`,
      customer: order.customer?.name || 'Unknown',
      codeCus: order.customer?.code || '',
      driverId: order.driverId,
      driverName: driver?.name || 'Chưa giao',
      items: order.orderItems?.map((i) => `${i.product?.name || 'Unknown'} ${i.product?.sizeKg || 0}kg × ${i.quantity}`).join(', ') || '',
      total: typeof order.total === 'number' ? order.total : Number(order.total) || 0,
      status: order.status || 'PENDING',
      createdAt: order.createdAt ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--',
    };
  });

  const filteredOrders = mappedOrders.filter((order) => {
    if (selectedDriverId === 'unassigned' && order.driverId !== null) return false;
    if (selectedDriverId !== 'all' && selectedDriverId !== 'unassigned' && order.driverId !== selectedDriverId) return false;
    if (selectedStatus !== 'Tất cả' && order.status !== selectedStatus) return false;
    if (search && !order.customer.toLowerCase().includes(search.toLowerCase()) && !order.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: mappedOrders.length,
    pending: mappedOrders.filter((o) => o.status === 'PENDING').length,
    shipping: mappedOrders.filter((o) => o.status === 'SHIPPING').length,
    delivered: mappedOrders.filter((o) => o.status === 'DELIVERED').length,
    completed: mappedOrders.filter((o) => o.status === 'COMPLETED').length,
    cancelled: mappedOrders.filter((o) => o.status === 'CANCELLED').length,
  };

  // Find the selected order from API data
  const selectedOrder = selectedOrderId
    ? orders.find((o) => o.id === selectedOrderId)
    : null;

  // Convert to PrintSlip format
  const slipOrder = selectedOrder
    ? {
        id: selectedOrder.id,
        code: selectedOrder.code || `DH-${selectedOrder.id.slice(-6).toUpperCase()}`,
        customer: selectedOrder.customer,
        orderItems: selectedOrder.orderItems.map((item) => ({
          product: { name: item.product.name, sizeKg: item.product.sizeKg },
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
        total: typeof selectedOrder.total === 'number' ? selectedOrder.total : Number(selectedOrder.total) || 0,
        createdAt: selectedOrder.createdAt,
      }
    : null;

  // Print effect removed - using react-to-print instead

  const handleCloseDrawer = () => {
    setSelectedOrderId(null);
  };

  const handlePrintFromDrawer = () => {
    print();
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedOrderId) return;

    // Show confirmation dialogs for COMPLETED and CANCELLED
    if (newStatus === 'COMPLETED') {
      setShowConfirmDialog(true);
      return;
    }
    if (newStatus === 'CANCELLED') {
      setShowCancelDialog(true);
      return;
    }

    // Direct update for other statuses
    await updateOrderStatus(newStatus);
  };

  const updateOrderStatus = async (newStatus: string, reason?: string) => {
    if (!selectedOrderId) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          cancellationReason: reason,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? 'Failed to update status');
      // Refresh orders
      const ordersRes = await fetch('/api/orders');
      const ordersData = await ordersRes.json();
      setOrders(ordersData);
      setShowConfirmDialog(false);
      setShowCancelDialog(false);
      setCancelReason('');
      toast({ type: 'success', title: 'Đã cập nhật trạng thái đơn hàng' });
    } catch (err) {
      console.error('Failed to update status:', err);
      toast({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: err instanceof Error ? err.message : 'Không thể cập nhật trạng thái đơn hàng',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Bulk assign selected orders to a driver
  const handleBulkAssign = async () => {
    if (!bulkAssignDriverId || selectedOrderIds.size === 0) return;
    setBulkAssigning(true);
    try {
      const res = await fetch('/api/orders/bulk-assign', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrderIds),
          driverId: bulkAssignDriverId,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? 'Failed to assign orders');
      // Refresh orders
      const ordersRes = await fetch('/api/orders');
      const ordersData = await ordersRes.json();
      setOrders(ordersData);
      setSelectedOrderIds(new Set());
      setBulkAssignDriverId('');
      toast({ type: 'success', title: 'Đã giao đơn cho tài xế' });
    } catch (err) {
      console.error('Failed to bulk assign:', err);
      toast({
        type: 'error',
        title: 'Giao đơn thất bại',
        message: err instanceof Error ? err.message : 'Không thể giao đơn',
      });
    } finally {
      setBulkAssigning(false);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrderIds);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrderIds(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map((o) => o.id)));
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

      <Sidebar />

      <main className="pl-64">
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black text-white">Quản lý Đơn hàng</h1>
              <p className="text-slate-400 mt-1">{mappedOrders.length} đơn hàng</p>
            </div>
            <OrderEntryDrawer customers={customers} products={products} />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedStatus('Tất cả')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedStatus === 'Tất cả'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Tất cả ({counts.all})
            </button>
            <button
              onClick={() => setSelectedStatus('PENDING')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedStatus === 'PENDING'
                  ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Chờ giao ({counts.pending})
            </button>
            <button
              onClick={() => setSelectedStatus('SHIPPING')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedStatus === 'SHIPPING'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Đang giao ({counts.shipping})
            </button>
            <button
              onClick={() => setSelectedStatus('DELIVERED')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedStatus === 'DELIVERED'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Đã giao ({counts.delivered})
            </button>
            <button
              onClick={() => setSelectedStatus('COMPLETED')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedStatus === 'COMPLETED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Hoàn thành ({counts.completed})
            </button>
            <button
              onClick={() => setSelectedStatus('CANCELLED')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedStatus === 'CANCELLED'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Đã hủy ({counts.cancelled})
            </button>
          </div>

          {/* Bulk Assign Bar - shown when orders selected */}
          {selectedOrderIds.size > 0 && (
            <div className="flex items-center gap-4 mb-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <span className="text-sm text-blue-400 font-medium">
                Đã chọn {selectedOrderIds.size} đơn hàng
              </span>
              <select
                value={bulkAssignDriverId}
                onChange={(e) => setBulkAssignDriverId(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
              >
                <option value="" className="bg-slate-900">-- Chọn tài xế --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkAssignDriverId || bulkAssigning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <TruckIcon className="h-4 w-4" />
                {bulkAssigning ? 'Đang giao...' : 'Giao đơn đã chọn'}
              </button>
              <button
                onClick={() => { setSelectedOrderIds(new Set()); setBulkAssignDriverId(''); }}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                Hủy
              </button>
            </div>
          )}

          {/* Filters Row */}
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

            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="all" className="bg-slate-900">Tất cả tài xế</option>
              <option value="unassigned" className="bg-slate-900">Chưa giao</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>
              ))}
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
            />

            <a
              href="/dashboard/map"
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <MapPin className="h-5 w-5" />
              Bản đồ
            </a>
          </div>

          {/* Orders Table */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="py-3 px-4 w-12">
                    <button
                      onClick={toggleAllSelection}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0 ? (
                        <CheckSquare className="h-5 w-5 text-blue-400" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Mã đơn</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Khách hàng</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Sản phẩm</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Tài xế</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Giờ</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Tổng tiền</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Trạng thái</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map((order) => {
                  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;
                  const StatusIcon = status.icon;

                  return (
                    <tr key={order.id} className={`hover:bg-white/5 transition-colors ${selectedOrderIds.has(order.id) ? 'bg-blue-500/5' : ''}`}>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => toggleOrderSelection(order.id)}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {selectedOrderIds.has(order.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-400" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-mono font-semibold text-blue-400">
                          #{order.code}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-white font-medium">{order.customer}</p>
                          <p className="text-xs text-slate-500">{order.codeCus}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-slate-300 truncate max-w-50" title={order.items}>
                          {order.items || '-'}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className={`text-sm ${order.driverId ? 'text-slate-300' : 'text-amber-400'}`}>{order.driverName}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-slate-400">{order.createdAt}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="text-sm font-bold text-emerald-400">
                          {order.total.toLocaleString('vi-VN')}đ
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 hover:text-white transition-all"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredOrders.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-slate-500">Không có đơn hàng nào</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Order Detail Drawer - overlay for quick view */}
      {selectedOrder && (
        <Drawer
          isOpen={selectedOrderId !== null}
          onClose={handleCloseDrawer}
          title={`Chi tiết đơn hàng #${slipOrder?.code}`}
        >
          <div className="space-y-4">
            {/* Status change dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={selectedOrder.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updatingStatus}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border-0 cursor-pointer ${statusConfig[selectedOrder.status as keyof typeof statusConfig]?.color || statusConfig.PENDING.color} ${updatingStatus ? 'opacity-50' : ''}`}
              >
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              {updatingStatus && <span className="text-xs text-slate-400">Đang cập nhật...</span>}
            </div>

            {/* Customer info */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Thông tin khách hàng</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Tên khách hàng</p>
                  <p className="font-medium text-white">{selectedOrder.customer.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Mã khách hàng</p>
                  <p className="font-mono text-blue-400">{selectedOrder.customer.code}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Địa chỉ</p>
                  <p className="text-white">{selectedOrder.customer.address}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Điện thoại</p>
                  <p className="text-white">{selectedOrder.customer.phone}</p>
                </div>
              </div>
            </div>

            {/* Order items */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Sản phẩm</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-white/10">
                    <th className="pb-2">Sản phẩm</th>
                    <th className="pb-2 text-center">SL</th>
                    <th className="pb-2 text-right">Đơn giá</th>
                    <th className="pb-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.orderItems.map((item) => (
                    <tr key={item.id} className="border-b border-white/5">
                      <td className="py-2 text-white">
                        {item.product.name} {item.product.sizeKg}kg
                      </td>
                      <td className="py-2 text-center text-slate-300">{item.quantity}</td>
                      <td className="py-2 text-right text-slate-300">
                        {Number(item.unitPrice).toLocaleString('vi-VN')}đ
                      </td>
                      <td className="py-2 text-right font-medium text-white">
                        {Number(item.lineTotal).toLocaleString('vi-VN')}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-slate-300">Tổng cộng</span>
              <span className="text-2xl font-bold text-emerald-400">
                {Number(selectedOrder.total).toLocaleString('vi-VN')}đ
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <a
                href={`/orders/${selectedOrder.id}`}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-600 hover:text-white transition-all"
              >
                <FileText className="h-4 w-4" />
                Xem chi tiết
              </a>
              <button
                onClick={handlePrintFromDrawer}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg"
              >
                <Printer className="h-4 w-4" />
                In phiếu giao hàng
              </button>
            </div>
          </div>
        </Drawer>
      )}

      {/* COMPLETED Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl bg-slate-800 border border-white/10 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">Xác nhận hoàn thành đơn hàng</h3>
            <p className="text-sm text-slate-400 mb-4">
              Khi xác nhận hoàn thành, hệ thống sẽ ghi nhận đã thanh toán đủ và cập nhật công nợ.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
              >
                Hủy
              </button>
              <button
                onClick={() => updateOrderStatus('COMPLETED')}
                disabled={updatingStatus}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {updatingStatus ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLED Reason Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl bg-slate-800 border border-white/10 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">Lý do hủy đơn hàng</h3>
            <p className="text-sm text-slate-400 mb-4">
              Vui lòng nhập lý do hủy đơn hàng này.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="VD: Khách hàng hủy, Hết hàng..."
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-red-500 focus:outline-none resize-none"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowCancelDialog(false); setCancelReason(''); }}
                className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
              >
                Hủy
              </button>
              <button
                onClick={() => updateOrderStatus('CANCELLED', cancelReason)}
                disabled={updatingStatus || !cancelReason.trim()}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {updatingStatus ? 'Đang xử lý...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print content - always in DOM for react-to-print */}
      <div ref={printRef} className="print-slip">
        {slipOrder && <PrintSlip order={slipOrder} />}
      </div>
    </div>
  );
}
