'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, LogOut, RefreshCw, Snowflake } from 'lucide-react';
import DeliveryCard from '@/components/driver/DeliveryCard';
import EmptyState from '@/components/driver/EmptyState';
import { useAuth } from '@/lib/auth-provider';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface DriverInfo {
  id: string;
  name: string;
}

interface OrderItem {
  quantity: number;
  product: {
    name: string;
    sizeKg: number;
  };
}

interface Customer {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
}

interface Order {
  id: string;
  status: 'SHIPPING' | 'DELIVERED';
  total: number;
  customer: Customer;
  orderItems: OrderItem[];
  driverName: string;
}

export default function DriverPage() {
  const { signOut } = useAuth();
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.DRIVER_APP.ORDERS);
      if (!response.ok) {
        throw new Error(response.status === 401 ? 'Tài khoản tài xế chưa được liên kết' : 'Không thể tải đơn hàng');
      }
      const json = await response.json();
      const data = json?.data !== undefined ? json.data : json;
      setDriver(data?.driver || null);
      setOrders(Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void fetchOrders();
  }, [fetchOrders]);

  const handleConfirm = useCallback(async (orderId: string) => {
    setOrders((previous) =>
      (previous || []).map((order) => (order.id === orderId ? { ...order, status: 'DELIVERED' as const } : order))
    );

    try {
      const response = await fetch(API_ENDPOINTS.ORDERS.CONFIRM(orderId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Không thể xác nhận đơn hàng');
      }
    } catch (err) {
      setOrders((previous) =>
        (previous || []).map((order) => (order.id === orderId ? { ...order, status: 'SHIPPING' as const } : order))
      );
      toast({
        type: 'error',
        title: 'Không thể xác nhận đơn hàng',
        message: err instanceof Error ? err.message : 'Đã xảy ra lỗi',
      });
    }
  }, []);

  const safeOrders = orders || [];
  const pendingCount = safeOrders.filter((order) => order.status === 'SHIPPING').length;
  const deliveredCount = safeOrders.filter((order) => order.status === 'DELIVERED').length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 animate-pulse items-center justify-center rounded bg-[#004a99]">
            <Snowflake className="h-6 w-6 text-[#9bbdff]" />
          </div>
          <p className="text-xs font-bold text-primary-deep">Đang tải danh sách đơn...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <div className="max-w-sm text-center bg-card p-6 rounded border border-outline-variant shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded bg-error-container text-error">
            <span className="text-2xl font-black">!</span>
          </div>
          <p className="mb-2 font-bold text-sm text-on-surface">{error}</p>
          <p className="mb-6 text-xs text-on-surface-variant">Nhấn Làm mới để thử lại hoặc liên hệ văn phòng điều phối</p>
          <button
            onClick={handleRefresh}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded bg-[#004a99] font-bold text-white transition-colors hover:bg-[#00346f] text-sm shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            LÀM MỚI
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="sticky top-0 z-20 border-b border-[#002754] bg-[#00346f] px-4 py-3.5 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[#004a99]">
              <Snowflake className="h-5 w-5 text-[#9bbdff]" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">IceFlow Tài Xế</h1>
              {driver && <p className="text-[11px] text-[#9bbdff] font-medium">Xe / Tài xế: {driver.name}</p>}
            </div>
          </div>
          <button
            onClick={() => void signOut()}
            className="rounded p-2 text-[#9bbdff] hover:bg-[#004a99] hover:text-white transition-colors"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="rounded border border-tertiary-container/30 bg-container-high p-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-primary-deep">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-bold uppercase">Chờ giao</span>
          </div>
          <p className="data-lg font-bold text-on-surface">{pendingCount}</p>
        </div>
        <div className="rounded border border-[#1b6d24]/30 bg-[#a0f399]/20 p-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-secondary">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-bold uppercase">Đã giao</span>
          </div>
          <p className="data-lg font-bold text-on-surface">{deliveredCount}</p>
        </div>
      </div>

      <div className="px-4 pb-1">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded border border-outline-variant bg-card text-xs font-bold text-primary-deep hover:bg-container-high transition-colors shadow-sm disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Đang cập nhật...' : 'CẬP NHẬT ĐƠN HÀNG'}
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyState driverName={driver?.name || 'Tài xế'} onRefresh={handleRefresh} />
      ) : (
        <div className="space-y-3 p-4">
          {orders.map((order, index) => (
            <div key={order.id} id={`order-${order.id}`}>
              <DeliveryCard
                order={{
                  id: order.id,
                  status: order.status,
                  total: order.total,
                  customer: order.customer,
                  orderItems: order.orderItems,
                }}
                index={index + 1}
                onConfirm={handleConfirm}
              />
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
