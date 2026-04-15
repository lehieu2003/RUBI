'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Search, Printer, FileText, Clock, Truck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { OrderEntryDrawer } from '@/components/order/order-entry-drawer';
import type { Customer, Product } from '@prisma/client';

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
  customer: CustomerInfo;
  orderItems: OrderItemWithProduct[];
}

// Placeholder driver (not tracked in DB yet)
const PLACEHOLDER_DRIVER = 'Anh Vinh';
const DRIVERS = ['Tất cả', 'Anh Vinh', 'Anh Hùng'];

const statusConfig = {
  DRAFT: { label: 'Chờ xử lý', icon: Clock, color: 'text-slate-400 bg-slate-500/20' },
  CONFIRMED: { label: 'Đã xác nhận', icon: CheckCircle2, color: 'text-blue-400 bg-blue-500/20' },
  PRINTED: { label: 'Đã in', icon: FileText, color: 'text-amber-400 bg-amber-500/20' },
  DELIVERED: { label: 'Đã giao', icon: Truck, color: 'text-emerald-400 bg-emerald-500/20' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderFromAPI[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('Tất cả');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [ordersRes, customersRes, productsRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/customers'),
          fetch('/api/products'),
        ]);

        if (!ordersRes.ok) throw new Error('Failed to fetch orders');
        if (!customersRes.ok) throw new Error('Failed to fetch customers');
        if (!productsRes.ok) throw new Error('Failed to fetch products');

        const [ordersData, customersData, productsData] = await Promise.all([
          ordersRes.json(),
          customersRes.json(),
          productsRes.json(),
        ]);

        setOrders(ordersData);
        setCustomers(customersData);
        setProducts(productsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Map API orders to table format
  const mappedOrders = orders.map((order) => ({
    id: order.id,
    code: order.code || `DH-${order.id.slice(-6).toUpperCase()}`,
    customer: order.customer?.name || 'Unknown',
    codeCus: order.customer?.code || '',
    driver: PLACEHOLDER_DRIVER,
    items: order.orderItems?.map((i) => `${i.product?.name || 'Unknown'} ${i.product?.sizeKg || 0}kg × ${i.quantity}`).join(', ') || '',
    total: typeof order.total === 'number' ? order.total : Number(order.total) || 0,
    status: order.status || 'DRAFT',
    createdAt: order.createdAt ? new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--',
  }));

  const filteredOrders = mappedOrders.filter((order) => {
    if (selectedDriver !== 'Tất cả' && order.driver !== selectedDriver) return false;
    if (selectedStatus !== 'Tất cả' && order.status !== selectedStatus) return false;
    if (search && !order.customer.toLowerCase().includes(search.toLowerCase()) && !order.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: mappedOrders.length,
    draft: mappedOrders.filter((o) => o.status === 'DRAFT').length,
    confirmed: mappedOrders.filter((o) => o.status === 'CONFIRMED').length,
    printed: mappedOrders.filter((o) => o.status === 'PRINTED').length,
    delivered: mappedOrders.filter((o) => o.status === 'DELIVERED').length,
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
              onClick={() => setSelectedStatus('DRAFT')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedStatus === 'DRAFT'
                  ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Chờ ({counts.draft})
            </button>
            <button
              onClick={() => setSelectedStatus('CONFIRMED')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedStatus === 'CONFIRMED'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Xác nhận ({counts.confirmed})
            </button>
            <button
              onClick={() => setSelectedStatus('PRINTED')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedStatus === 'PRINTED'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Đã in ({counts.printed})
            </button>
            <button
              onClick={() => setSelectedStatus('DELIVERED')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedStatus === 'DELIVERED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              Đã giao ({counts.delivered})
            </button>
          </div>

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
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
            >
              {DRIVERS.map((d) => (
                <option key={d} value={d} className="bg-slate-900">{d}</option>
              ))}
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Orders Table */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
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
                  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.DRAFT;
                  const StatusIcon = status.icon;

                  return (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
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
                        <p className="text-sm text-slate-300">{order.items}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-slate-400">{order.driver}</p>
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
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 hover:text-white transition-all"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Xem
                        </Link>
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
    </div>
  );
}
