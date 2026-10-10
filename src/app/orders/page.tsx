'use client';

import { useState, useRef } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useReactToPrint } from 'react-to-print';
import {
  Search,
  Printer,
  FileText,
  Clock,
  Truck,
  CheckCircle2,
  Package,
  XCircle,
  TruckIcon,
  CheckSquare,
  Square,
} from 'lucide-react';
import { OrderEntryDrawer } from '@/components/order/order-entry-drawer';
import { Drawer } from '@/components/ui/drawer';
import { PrintSlip } from '@/components/order/print-slip';
import type { Customer, Product } from '@prisma/client';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

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
  PENDING: {
    label: 'Chờ giao',
    icon: Clock,
    color: 'text-tertiary-container bg-container-high',
  },
  SHIPPING: {
    label: 'Đang giao',
    icon: Truck,
    color: 'text-primary-accent bg-container-high',
  },
  DELIVERED: {
    label: 'Đã giao',
    icon: Package,
    color: 'text-secondary bg-[#a0f399]/40',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    icon: CheckCircle2,
    color: 'text-secondary bg-[#a0f399]/40',
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: XCircle,
    color: 'text-error bg-error-container',
  },
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [filterDate, setFilterDate] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkAssignDriverId, setBulkAssignDriverId] = useState<string>('');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const printRef = useRef(null);
  const print = useReactToPrint({
    contentRef: printRef,
  });

  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
  } = useQuery<OrderFromAPI[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch(API_ENDPOINTS.ORDERS.BASE);
      if (!res.ok) throw new Error('Failed to load orders');
      const json = await res.json();
      return json?.data !== undefined ? json.data : json;
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch(API_ENDPOINTS.CUSTOMERS.BASE);
      if (!res.ok) throw new Error('Failed to load customers');
      const json = await res.json();
      return json?.data !== undefined ? json.data : json;
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch(API_ENDPOINTS.PRODUCTS.BASE);
      if (!res.ok) throw new Error('Failed to load products');
      const json = await res.json();
      return json?.data !== undefined ? json.data : json;
    },
  });

  const { data: drivers = [] } = useQuery<DriverFromAPI[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await fetch(API_ENDPOINTS.DRIVERS.BASE);
      if (!res.ok) throw new Error('Failed to load drivers');
      const json = await res.json();
      return json?.data !== undefined ? json.data : json;
    },
  });

  const loading = ordersLoading;
  const error = ordersError
    ? ordersError instanceof Error
      ? ordersError.message
      : 'Unknown error'
    : null;

  const mappedOrders = orders.map((order) => {
    const driver = drivers.find((d) => d.id === order.driverId);
    return {
      id: order.id,
      code: order.code || 'DH-' + order.id.slice(-6).toUpperCase(),
      customer: order.customer?.name || 'Unknown',
      codeCus: order.customer?.code || '',
      driverId: order.driverId,
      driverName: driver?.name || 'Chưa giao',
      items:
        order.orderItems
          ?.map(
            (i) =>
              (i.product?.name || 'Unknown') +
              ' ' +
              (i.product?.sizeKg || 0) +
              'kg × ' +
              i.quantity,
          )
          .join(', ') || '',
      total:
        typeof order.total === 'number'
          ? order.total
          : Number(order.total) || 0,
      status: order.status || 'PENDING',
      createdAt: order.createdAt
        ? new Date(order.createdAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '--:--',
    };
  });

  const filteredOrders = mappedOrders.filter((order) => {
    if (selectedDriverId === 'unassigned' && order.driverId !== null)
      return false;
    if (
      selectedDriverId !== 'all' &&
      selectedDriverId !== 'unassigned' &&
      order.driverId !== selectedDriverId
    )
      return false;
    if (selectedStatus !== 'Tất cả' && order.status !== selectedStatus)
      return false;
    if (
      search &&
      !order.customer.toLowerCase().includes(search.toLowerCase()) &&
      !order.code.toLowerCase().includes(search.toLowerCase())
    )
      return false;
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

  const selectedOrder = selectedOrderId
    ? orders.find((o) => o.id === selectedOrderId)
    : null;

  const slipOrder = selectedOrder
    ? {
        id: selectedOrder.id,
        code:
          selectedOrder.code ||
          'DH-' + selectedOrder.id.slice(-6).toUpperCase(),
        customer: selectedOrder.customer,
        orderItems: selectedOrder.orderItems.map((item) => ({
          product: { name: item.product.name, sizeKg: item.product.sizeKg },
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
        total:
          typeof selectedOrder.total === 'number'
            ? selectedOrder.total
            : Number(selectedOrder.total) || 0,
        createdAt: selectedOrder.createdAt,
      }
    : null;

  const handleCloseDrawer = () => {
    setSelectedOrderId(null);
  };

  const handlePrintFromDrawer = () => {
    print();
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedOrderId) return;

    if (newStatus === 'CANCELLED') {
      setShowCancelDialog(true);
      return;
    }

    await updateOrderStatus(newStatus);
  };

  const updateOrderStatus = async (newStatus: string, reason?: string) => {
    if (!selectedOrderId) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(API_ENDPOINTS.ORDERS.STATUS(selectedOrderId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          cancellationReason: reason,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? 'Failed to update status');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowCancelDialog(false);
      setCancelReason('');
      toast({ type: 'success', title: 'Đã cập nhật trạng thái đơn hàng' });
    } catch (err) {
      console.error('Failed to update status:', err);
      toast({
        type: 'error',
        title: 'Cập nhật thất bại',
        message:
          err instanceof Error
            ? err.message
            : 'Không thể cập nhật trạng thái đơn hàng',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignDriverId || selectedOrderIds.size === 0) return;
    setBulkAssigning(true);
    try {
      const res = await fetch(API_ENDPOINTS.ORDERS.BULK_ASSIGN, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrderIds),
          driverId: bulkAssignDriverId,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? 'Failed to assign orders');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
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

  if (loading && orders.length === 0) {
    return (
      <div className='min-h-screen bg-surface flex items-center justify-center'>
        <div className='text-primary-accent font-bold'>Đang tải đơn hàng...</div>
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
              Quản Lý Đơn Hàng
            </h1>
            <p className='text-xs text-on-surface-variant mt-1'>
              {mappedOrders.length} đơn hàng trong ca trực
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <OrderEntryDrawer customers={customers} products={products} />
          </div>{' '}
        </div>

        {/* Quick Filters Status */}
        <div className='flex items-center gap-2 mb-6 overflow-x-auto pb-2'>
          <button
            onClick={() => setSelectedStatus('Tất cả')}
            className={
              'px-3.5 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-all ' +
              (selectedStatus === 'Tất cả'
                ? 'bg-[#004a99] text-white shadow-sm'
                : 'bg-container-high text-primary-deep hover:bg-container-highest')
            }
          >
            Tất cả ({counts.all})
          </button>
          <button
            onClick={() => setSelectedStatus('PENDING')}
            className={
              'px-3.5 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-all ' +
              (selectedStatus === 'PENDING'
                ? 'bg-[#7f3700] text-white shadow-sm'
                : 'bg-container-high text-primary-deep hover:bg-container-highest')
            }
          >
            Chờ giao ({counts.pending})
          </button>
          <button
            onClick={() => setSelectedStatus('SHIPPING')}
            className={
              'px-3.5 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-all ' +
              (selectedStatus === 'SHIPPING'
                ? 'bg-[#004a99] text-white shadow-sm'
                : 'bg-container-high text-primary-deep hover:bg-container-highest')
            }
          >
            Đang giao ({counts.shipping})
          </button>
          <button
            onClick={() => setSelectedStatus('DELIVERED')}
            className={
              'px-3.5 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-all ' +
              (selectedStatus === 'DELIVERED'
                ? 'bg-[#1b6d24] text-white shadow-sm'
                : 'bg-container-high text-primary-deep hover:bg-container-highest')
            }
          >
            Đã giao ({counts.delivered})
          </button>
          <button
            onClick={() => setSelectedStatus('COMPLETED')}
            className={
              'px-3.5 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-all ' +
              (selectedStatus === 'COMPLETED'
                ? 'bg-[#217128] text-white shadow-sm'
                : 'bg-container-high text-primary-deep hover:bg-container-highest')
            }
          >
            Hoàn thành ({counts.completed})
          </button>
          <button
            onClick={() => setSelectedStatus('CANCELLED')}
            className={
              'px-3.5 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-all ' +
              (selectedStatus === 'CANCELLED'
                ? 'bg-[#ba1a1a] text-white shadow-sm'
                : 'bg-container-high text-primary-deep hover:bg-container-highest')
            }
          >
            Đã hủy ({counts.cancelled})
          </button>
        </div>

        {/* Bulk Assign Bar */}
        {selectedOrderIds.size > 0 && (
          <div className='flex items-center gap-4 mb-4 p-4 rounded bg-container-high border border-[#004a99]'>
            <span className='text-sm text-primary-deep font-bold'>
              Đã chọn {selectedOrderIds.size} đơn hàng
            </span>
            <select
              value={bulkAssignDriverId}
              onChange={(e) => setBulkAssignDriverId(e.target.value)}
              className='px-3 py-1.5 bg-card border border-outline-variant rounded text-sm text-on-surface'
            >
              <option value=''>-- Chọn tài xế --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkAssign}
              disabled={!bulkAssignDriverId || bulkAssigning}
              className='px-4 py-1.5 bg-[#004a99] hover:bg-[#00346f] disabled:bg-container-highest text-white text-xs font-bold rounded transition-colors flex items-center gap-1.5'
            >
              <TruckIcon className='h-4 w-4' />
              {bulkAssigning ? 'Đang giao...' : 'Giao đơn đã chọn'}
            </button>
            <button
              onClick={() => {
                setSelectedOrderIds(new Set());
                setBulkAssignDriverId('');
              }}
              className='px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface'
            >
              Hủy
            </button>
          </div>
        )}

        {/* Filters Row */}
        <div className='flex flex-wrap items-center gap-3 mb-6 bg-card p-4 rounded border border-outline-variant shadow-sm'>
          <div className='relative flex-1 min-w-[240px]'>
            <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-faint' />
            <input
              type='text'
              placeholder='Tìm mã đơn, tên khách...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='w-full pl-10 pr-4 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface placeholder-faint focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99]'
            />
          </div>

          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className='px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface'
          >
            <option value='all'>Tất cả tài xế</option>
            <option value='unassigned'>Chưa giao</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <div className='w-[170px]'>
            <DatePicker
              value={filterDate}
              onChange={setFilterDate}
              placeholder='Lọc theo ngày'
              ariaLabel='Lọc đơn theo ngày'
              className='h-[38px]'
              align='right'
              clearable
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className='overflow-hidden rounded border border-outline-variant bg-card shadow-sm'>
          <table className='w-full text-left border-collapse table-industrial'>
            <thead>
              <tr className='border-b border-outline-variant bg-[#f0f4fc] text-[12px] font-bold uppercase tracking-wider text-on-surface'>
                <th className='py-2.5 px-3 w-10'>
                  <button
                    onClick={toggleAllSelection}
                    className='text-on-surface-variant hover:text-primary-deep transition-colors'
                  >
                    {selectedOrderIds.size === filteredOrders.length &&
                    filteredOrders.length > 0 ? (
                      <CheckSquare className='h-4 w-4 text-primary-accent' />
                    ) : (
                      <Square className='h-4 w-4' />
                    )}
                  </button>
                </th>
                <th className='py-2.5 px-3'>Mã đơn</th>
                <th className='py-2.5 px-3'>Khách hàng</th>
                <th className='py-2.5 px-3'>Sản phẩm</th>
                <th className='py-2.5 px-3'>Tài xế</th>
                <th className='py-2.5 px-3'>Giờ</th>
                <th className='py-2.5 px-3 text-right'>Tổng tiền</th>
                <th className='py-2.5 px-3 text-center'>Trạng thái</th>
                <th className='py-2.5 px-3 text-right'>Thao tác</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#e2e8f0] text-sm'>
              {filteredOrders.map((order) => {
                const status =
                  statusConfig[order.status as keyof typeof statusConfig] ||
                  statusConfig.PENDING;
                const StatusIcon = status.icon;

                return (
                  <tr
                    key={order.id}
                    className={
                      'h-11 hover:bg-container-low transition-colors ' +
                      (selectedOrderIds.has(order.id) ? 'bg-container-high/40' : '')
                    }
                  >
                    <td className='py-2.5 px-3'>
                      <button
                        onClick={() => toggleOrderSelection(order.id)}
                        className='text-faint hover:text-primary-deep transition-colors'
                      >
                        {selectedOrderIds.has(order.id) ? (
                          <CheckSquare className='h-4 w-4 text-primary-accent' />
                        ) : (
                          <Square className='h-4 w-4' />
                        )}
                      </button>
                    </td>
                    <td className='py-2.5 px-3 font-mono font-bold text-xs text-primary-accent'>
                      #{order.code}
                    </td>
                    <td className='py-2.5 px-3'>
                      <p className='font-semibold text-on-surface leading-tight'>
                        {order.customer}
                      </p>
                      <p className='text-xs text-on-surface-variant font-mono leading-tight mt-0.5'>
                        {order.codeCus}
                      </p>
                    </td>
                    <td
                      className='py-2.5 px-3 text-xs text-on-surface truncate max-w-xs font-medium'
                      title={order.items}
                    >
                      {order.items || '-'}
                    </td>
                    <td className='py-2.5 px-3 text-xs font-medium'>
                      <span
                        className={
                          order.driverId
                            ? 'text-on-surface'
                            : 'text-tertiary-container font-bold'
                        }
                      >
                        {order.driverName}
                      </span>
                    </td>
                    <td className='py-2.5 px-3 text-xs font-mono text-on-surface-variant tabular-nums'>
                      {order.createdAt}
                    </td>
                    <td className='py-2.5 px-3 text-right font-mono font-bold text-on-surface tabular-nums'>
                      {order.total.toLocaleString('vi-VN')}đ
                    </td>
                    <td className='py-2.5 px-3 text-center'>
                      <span
                        className={
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ' +
                          status.color
                        }
                      >
                        <StatusIcon className='h-3 w-3' />
                        {status.label}
                      </span>
                    </td>
                    <td className='py-2.5 px-3 text-right'>
                      <button
                        onClick={() => setSelectedOrderId(order.id)}
                        className='inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#004a99] text-primary-accent hover:bg-container-high text-xs font-semibold transition-colors'
                      >
                        <Printer className='h-3.5 w-3.5' />
                        Xem / In
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className='py-16 text-center'>
              <div className='mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3'>
                <FileText className='h-6 w-6 text-faint' />
              </div>
              <p className='text-sm font-semibold text-on-surface'>
                Không tìm thấy đơn hàng
              </p>
              <p className='text-xs text-faint mt-1'>
                Không có đơn hàng nào khớp với điều kiện lọc hiện tại
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <Drawer
          isOpen={selectedOrderId !== null}
          onClose={handleCloseDrawer}
          title={'Chi tiết đơn hàng #' + (slipOrder?.code || '')}
        >
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <select
                value={selectedOrder.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updatingStatus}
                className={
                  'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-bold border border-outline-variant cursor-pointer ' +
                  (statusConfig[
                    selectedOrder.status as keyof typeof statusConfig
                  ]?.color || statusConfig.PENDING.color) +
                  (updatingStatus ? ' opacity-50' : '')
                }
              >
                {Object.entries(statusConfig)
                  // COMPLETED is reached only through settlement (đối soát)
                  .filter(
                    ([key]) =>
                      key !== 'COMPLETED' ||
                      selectedOrder.status === 'COMPLETED'
                  )
                  .map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
              </select>
              {updatingStatus && (
                <span className='text-xs text-faint'>Đang cập nhật...</span>
              )}
            </div>

            {/* Customer info */}
            <div className='rounded border border-outline-variant bg-surface p-4'>
              <h3 className='text-xs font-bold text-on-surface-variant uppercase mb-2'>
                Thông tin khách hàng
              </h3>
              <div className='grid grid-cols-2 gap-3 text-xs'>
                <div>
                  <p className='text-faint'>Tên khách hàng</p>
                  <p className='font-bold text-on-surface'>
                    {selectedOrder.customer.name}
                  </p>
                </div>
                <div>
                  <p className='text-faint'>Mã khách hàng</p>
                  <p className='font-mono text-primary-accent font-bold'>
                    {selectedOrder.customer.code}
                  </p>
                </div>
                <div>
                  <p className='text-faint'>Địa chỉ</p>
                  <p className='text-on-surface'>
                    {selectedOrder.customer.address}
                  </p>
                </div>
                <div>
                  <p className='text-faint'>Điện thoại</p>
                  <p className='text-on-surface font-mono'>
                    {selectedOrder.customer.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Order items */}
            <div className='rounded border border-outline-variant bg-card p-4 shadow-sm'>
              <h3 className='text-xs font-bold text-on-surface-variant uppercase mb-2'>
                Sản phẩm đặt
              </h3>
              <table className='w-full text-xs'>
                <thead>
                  <tr className='text-left text-faint border-b border-outline-soft'>
                    <th className='pb-2'>Sản phẩm</th>
                    <th className='pb-2 text-center'>SL</th>
                    <th className='pb-2 text-right'>Đơn giá</th>
                    <th className='pb-2 text-right'>Thành tiền</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-outline-soft'>
                  {selectedOrder.orderItems.map((item) => (
                    <tr key={item.id}>
                      <td className='py-2 text-on-surface font-medium'>
                        {item.product.name} {item.product.sizeKg}kg
                      </td>
                      <td className='py-2 text-center font-bold'>
                        {item.quantity}
                      </td>
                      <td className='py-2 text-right data-sm'>
                        {Number(item.unitPrice).toLocaleString('vi-VN')}đ
                      </td>
                      <td className='py-2 text-right data-sm font-bold text-on-surface'>
                        {Number(item.lineTotal).toLocaleString('vi-VN')}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className='flex justify-between items-center bg-surface p-3 rounded border border-outline-variant'>
              <span className='text-xs font-bold uppercase text-on-surface-variant'>
                Tổng cộng
              </span>
              <span className='data-lg font-bold text-on-surface'>
                {Number(selectedOrder.total).toLocaleString('vi-VN')}đ
              </span>
            </div>

            {/* Actions */}
            <div className='flex gap-2.5 pt-2'>
              <a
                href={'/orders/' + selectedOrder.id}
                className='flex-1 flex items-center justify-center gap-1.5 rounded border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-container-high hover:text-primary-deep transition-all'
              >
                <FileText className='h-4 w-4' />
                Chi tiết
              </a>
              <button
                onClick={handlePrintFromDrawer}
                className='flex-1 flex items-center justify-center gap-1.5 rounded bg-[#004a99] hover:bg-[#00346f] px-3 py-2 text-xs font-bold text-white transition-colors shadow-sm'
              >
                <Printer className='h-4 w-4' />
                In phiếu K80
              </button>
            </div>
          </div>
        </Drawer>
      )}

      {/* CANCELLED Reason Dialog */}
      {showCancelDialog && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs'>
          <div className='w-full max-w-sm rounded bg-card border border-outline-variant p-6 shadow-xl'>
            <h3 className='text-base font-bold text-error mb-2'>
              Lý do hủy đơn hàng
            </h3>
            <p className='text-xs text-on-surface-variant mb-4'>
              Vui lòng nhập lý do hủy đơn hàng này.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder='VD: Khách gọi báo dời ngày, Xe sự cố...'
              className='w-full rounded border border-outline-variant bg-card px-3 py-2 text-xs text-on-surface focus:border-[#ba1a1a] focus:outline-none resize-none'
              rows={3}
            />
            <div className='flex gap-2.5 mt-4'>
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason('');
                }}
                className='flex-1 rounded border border-outline-variant px-3 py-2 text-xs font-bold text-on-surface-variant hover:bg-container-high'
              >
                Hủy
              </button>
              <button
                onClick={() => updateOrderStatus('CANCELLED', cancelReason)}
                disabled={updatingStatus || !cancelReason.trim()}
                className='flex-1 rounded bg-[#ba1a1a] hover:bg-[#93000a] px-3 py-2 text-xs font-bold text-white disabled:opacity-50'
              >
                {updatingStatus ? 'Đang xử lý...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print content - always in DOM for react-to-print */}
      <div ref={printRef} className='print-slip'>
        {slipOrder && <PrintSlip order={slipOrder} />}
      </div>
    </DashboardLayout>
  );
}
