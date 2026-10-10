'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { CheckCircle2, Clock, Search, Download, Package } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { MAX_PAGE_SIZE } from '@/lib/pagination';
import { exportToCSV } from '@/lib/export-excel';

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
  PENDING: { label: 'Chờ giao', color: 'bg-slate-500/20 text-faint' },
  SHIPPING: { label: 'Đang giao', color: 'bg-amber-500/20 text-amber-400' },
  DELIVERED: { label: 'Đã giao', color: 'bg-blue-500/20 text-primary-accent' },
  COMPLETED: {
    label: 'Hoàn thành',
    color: 'bg-emerald-500/20 text-secondary',
  },
  CANCELLED: { label: 'Đã hủy', color: 'bg-red-500/20 text-error' },
};

/** Every order matching a filter. The list is paginated, so read page after page. */
async function fetchAllOrders(filter: string): Promise<OrderFromAPI[]> {
  const all: OrderFromAPI[] = [];
  for (let page = 1; ; page += 1) {
    const res = await fetch(`${API_ENDPOINTS.ORDERS.BASE}?${filter}&page=${page}&limit=${MAX_PAGE_SIZE}`);
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error ?? 'Không thể tải danh sách đơn hàng');
    all.push(...(json.data as OrderFromAPI[]));
    if (page >= (json.meta?.total_page ?? 1)) return all;
  }
}

/** Every order of one day: the stat cards need every status. */
function fetchOrdersOfDay(date: string): Promise<OrderFromAPI[]> {
  return fetchAllOrders(`date=${date}`);
}

/**
 * Every order waiting to be settled, whatever day it was taken: a night-shift
 * order settled the next morning must still be listed here, the only screen
 * that can complete it.
 */
function fetchOrdersAwaitingSettlement(): Promise<OrderFromAPI[]> {
  return fetchAllOrders('status=DELIVERED');
}

export default function SettlePage() {
  const [orders, setOrders] = useState<OrderFromAPI[]>([]);
  const [awaiting, setAwaiting] = useState<OrderFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [reconcileOrder, setReconcileOrder] = useState<OrderFromAPI | null>(
    null,
  );
  const [reconcileItems, setReconcileItems] = useState<Record<string, number>>(
    {},
  );
  const [reconcileLoading, setReconcileLoading] = useState(false);

  // Compute today string for default date filter
  const today = new Date();
  // Local calendar date: toISOString() is UTC and gives yesterday before 7 a.m. in Vietnam.
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    async function fetchOrders() {
      try {
        const [ofToday, toSettle] = await Promise.all([
          fetchOrdersOfDay(todayStr),
          fetchOrdersAwaitingSettlement(),
        ]);
        setOrders(ofToday);
        setAwaiting(toSettle);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [todayStr]);

  // Map API orders to display format
  const mappedOrders = awaiting.map((order) => ({
    id: order.id,
    code: order.code || `DH-${order.id.slice(-6).toUpperCase()}`,
    customerName: order.customer?.name || 'Unknown',
    customerCode: order.customer?.code || '',
    driverName: order.driver?.name || 'Chưa giao',
    items:
      order.orderItems
        ?.map(
          (i) =>
            `${i.product?.name || 'Unknown'} ${i.product?.sizeKg || 0}kg x ${i.quantity}`,
        )
        .join(', ') || '',
    total:
      typeof order.total === 'number' ? order.total : Number(order.total) || 0,
    status: order.status || 'PENDING',
    // Orders carried over from an earlier day show their date as well.
    createdAt: order.createdAt
      ? new Date(order.createdAt).toLocaleString('vi-VN', {
          ...(new Date(order.createdAt).toDateString() === today.toDateString()
            ? {}
            : { day: '2-digit', month: '2-digit' }),
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--:--',
  }));

  // Reconciliation list = every DELIVERED order, whatever day it was taken
  const filteredOrders = mappedOrders.filter((order) => {
    if (
      search &&
      !order.customerName.toLowerCase().includes(search.toLowerCase()) &&
      !order.code.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const pendingCount = awaiting.length;
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
      const items = Object.entries(reconcileItems).map(([id, actualQty]) => ({
        id,
        actualQty,
      }));
      const res = await fetch(
        API_ENDPOINTS.ORDERS.RECONCILE(reconcileOrder.id),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Reconciliation failed');
      }
      // The order is settled from here on: close and say so before
      // refreshing, so a failed refresh is never reported as a failed settlement.
      const settledId = reconcileOrder.id;
      setAwaiting((previous) => previous.filter((order) => order.id !== settledId));
      setReconcileOrder(null);
      toast({ type: 'success', title: 'Đã chốt đơn thành công' });
      try {
        const [ofToday, toSettle] = await Promise.all([
          fetchOrdersOfDay(todayStr),
          fetchOrdersAwaitingSettlement(),
        ]);
        setOrders(ofToday);
        setAwaiting(toSettle);
      } catch {
        toast({ type: 'error', title: 'Không tải lại được danh sách', message: 'Đơn đã chốt. Tải lại trang để cập nhật.' });
      }
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
      <div className='min-h-screen bg-surface flex items-center justify-center'>
        <div className='text-primary-accent font-bold'>Đang tải đối soát...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen bg-surface flex items-center justify-center'>
        <div className='text-error font-bold'>Lỗi: {error}</div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className='p-4 sm:p-6 lg:p-8 max-w-[1400px]'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4 mb-6'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-on-surface'>
              Đối Soát & Chốt Đơn Cuối Ca
            </h1>
            <p className='text-xs text-on-surface-variant mt-1'>
              {pendingCount} đơn hàng đã giao cần xác nhận số lượng thực tế
            </p>
          </div>
          {filteredOrders.length > 0 && (
            <button
              onClick={() => {
                const headers = [
                  'Mã đơn',
                  'Khách hàng',
                  'Mã KH',
                  'Tài xế giao',
                  'Sản phẩm & SL',
                  'Tổng tiền (VND)',
                  'Trạng thái',
                  'Giờ tạo',
                ];
                const rows = filteredOrders.map((o) => [
                  o.code,
                  o.customerName,
                  o.customerCode,
                  o.driverName,
                  o.items,
                  o.total,
                  o.status,
                  o.createdAt,
                ]);
                exportToCSV(`Doi_Soat_Ca_${todayStr}`, headers, rows);
              }}
              className='inline-flex items-center gap-2 px-3.5 py-2.5 border border-outline-variant bg-card hover:bg-container-high text-primary-deep font-bold text-xs rounded transition-all shadow-sm self-start sm:self-auto'
            >
              <Download className='h-4 w-4' />
              XUẤT BẢNG ĐỐI SOÁT
            </button>
          )}
        </div>

        {/* Stats */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
          <div className='rounded border border-tertiary-container/30 bg-container-high p-4'>
            <div className='flex items-center gap-3'>
              <div className='h-10 w-10 rounded bg-[#004a99] flex items-center justify-center text-white'>
                <Clock className='h-5 w-5 text-[#9bbdff]' />
              </div>
              <div>
                <p className='text-xs font-bold text-primary-deep uppercase'>
                  Chờ đối soát
                </p>
                <p className='data-lg font-bold text-on-surface'>
                  {pendingCount}
                </p>
              </div>
            </div>
          </div>
          <div className='rounded border border-[#1b6d24]/30 bg-[#a0f399]/20 p-4'>
            <div className='flex items-center gap-3'>
              <div className='h-10 w-10 rounded bg-[#1b6d24] flex items-center justify-center text-white'>
                <CheckCircle2 className='h-5 w-5' />
              </div>
              <div>
                <p className='text-xs font-bold text-secondary uppercase'>
                  Đã đối soát hôm nay
                </p>
                <p className='data-lg font-bold text-on-surface'>
                  {completedCount}
                </p>
              </div>
            </div>
          </div>
          <div className='rounded border border-outline-variant bg-card p-4'>
            <div className='flex items-center gap-3'>
              <div className='h-10 w-10 rounded bg-container flex items-center justify-center text-on-surface-variant'>
                <Package className='h-5 w-5 text-primary-deep' />
              </div>
              <div>
                <p className='text-xs font-bold text-on-surface-variant uppercase'>
                  Tổng đơn trong ngày
                </p>
                <p className='data-lg font-bold text-on-surface'>
                  {orders.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className='flex items-center gap-4 mb-6'>
          <div className='relative flex-1 max-w-md'>
            <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint' />
            <input
              type='text'
              placeholder='Tìm theo tên khách hoặc mã đơn...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='w-full pl-10 pr-4 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface placeholder-faint focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99]'
            />
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className='text-center py-16 bg-card rounded border border-outline-variant'>
            <Package className='h-10 w-10 text-faint mx-auto mb-2' />
            <p className='text-xs text-faint'>
              Không có đơn hàng nào cần đối soát
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {filteredOrders.map((order) => {
              const rawOrder = awaiting.find((o) => o.id === order.id);
              const status =
                statusConfig[order.status as keyof typeof statusConfig] ||
                statusConfig.PENDING;

              return (
                <div
                  key={order.id}
                  className='rounded border border-outline-variant p-4 bg-card hover:bg-container-low transition-all shadow-sm'
                >
                  <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2.5 mb-1.5'>
                        <span className='font-mono text-xs font-bold text-primary-accent bg-container-high px-2 py-0.5 rounded'>
                          {order.code}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <h3 className='text-base font-bold text-on-surface'>
                        {order.customerName}
                      </h3>
                      <p className='text-on-surface text-xs font-medium mt-1'>
                        {order.items}
                      </p>
                      <div className='flex items-center gap-4 mt-2 text-xs text-on-surface-variant'>
                        <span>
                          Tài xế:{' '}
                          <strong className='text-on-surface font-semibold'>
                            {order.driverName}
                          </strong>
                        </span>
                        <span>
                          Giờ tạo:{' '}
                          <strong className='text-on-surface font-mono tabular-nums'>
                            {order.createdAt}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className='text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-200'>
                      <p className='font-mono text-lg font-bold text-on-surface tabular-nums'>
                        {order.total.toLocaleString('vi-VN')}đ
                      </p>
                      {order.status === 'DELIVERED' && rawOrder && (
                        <button
                          onClick={() => handleSettle(rawOrder)}
                          className='mt-2 px-4 py-2 bg-[#1b6d24] hover:bg-[#217128] text-white font-bold rounded text-xs transition-colors shadow-sm'
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
          <div
            className='fixed inset-0 z-40 bg-black/40 backdrop-blur-xs'
            onClick={() => setReconcileOrder(null)}
          />
          <div
            role='dialog'
            aria-modal='true'
            aria-label='Chốt đơn đối soát'
            className='fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-outline-variant rounded shadow-xl p-6'
          >
            <h3 className='text-lg font-bold text-on-surface mb-1'>
              Chốt đơn{' '}
              {reconcileOrder.code ||
                `DH-${reconcileOrder.id.slice(-6).toUpperCase()}`}
            </h3>
            <p className='text-on-surface-variant text-xs mb-5'>
              {reconcileOrder.customer?.name}
            </p>

            {/* Line items */}
            <div className='space-y-3 mb-6'>
              <p className='text-xs font-bold uppercase tracking-wider text-on-surface-variant'>
                Số lượng thực giao
              </p>
              {reconcileOrder.orderItems?.map((item) => (
                <div
                  key={item.id}
                  className='flex items-center gap-3 p-2.5 rounded bg-surface border border-outline-soft'
                >
                  <div className='flex-1'>
                    <p className='text-xs font-bold text-on-surface'>
                      {item.product?.name || 'Sản phẩm'}
                    </p>
                    <p className='text-faint text-[11px]'>
                      {item.product?.sizeKg || 0}kg x {item.quantity} — Đơn giá:{' '}
                      {Number(item.unitPrice).toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                  <div className='flex items-center gap-1.5'>
                    <input
                      type='number'
                      min='0'
                      value={reconcileItems[item.id] ?? item.quantity}
                      onChange={(e) =>
                        setReconcileItems((prev) => ({
                          ...prev,
                          [item.id]: parseInt(e.target.value) || 0,
                        }))
                      }
                      className='w-16 px-2 py-1.5 bg-card border border-outline-variant rounded text-on-surface text-center text-xs font-bold data-sm focus:outline-none focus:border-[#004a99]'
                    />
                    <span className='text-xs text-faint'>
                      / {item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className='flex gap-2.5 mt-6'>
              <button
                onClick={() => setReconcileOrder(null)}
                className='flex-1 py-2.5 border border-outline-variant text-on-surface-variant font-bold text-xs rounded hover:bg-container-high transition-colors'
              >
                HỦY
              </button>
              <button
                onClick={handleReconcile}
                disabled={reconcileLoading}
                className='flex-1 py-2.5 bg-[#1b6d24] hover:bg-[#217128] disabled:bg-container-highest text-white font-bold text-xs rounded transition-colors shadow-sm'
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
