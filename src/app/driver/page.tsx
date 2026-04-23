'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, LogOut, RefreshCw, Snowflake } from 'lucide-react';
import DeliveryCard from '@/components/driver/DeliveryCard';
import DriverMap from '@/components/driver/DriverMap';
import EmptyState from '@/components/driver/EmptyState';
import { useAuth } from '@/lib/auth-provider';
import { toast } from '@/components/dashboard/toast';

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
  deliveryGps: { lat: number; lng: number } | null;
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
  const [showMap, setShowMap] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/driver/orders');
      if (!response.ok) {
        throw new Error(response.status === 401 ? 'Tài khoản tài xế chưa được liên kết' : 'Không thể tải đơn hàng');
      }
      const data = await response.json();
      setDriver(data.driver);
      setOrders(data.orders);
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
      previous.map((order) => (order.id === orderId ? { ...order, status: 'DELIVERED' as const } : order))
    );

    try {
      const response = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gps: null }),
      });

      if (!response.ok) {
        throw new Error('Không thể xác nhận đơn hàng');
      }
    } catch (err) {
      setOrders((previous) =>
        previous.map((order) => (order.id === orderId ? { ...order, status: 'SHIPPING' as const } : order))
      );
      toast({
        type: 'error',
        title: 'Không thể xác nhận đơn hàng',
        message: err instanceof Error ? err.message : 'Đã xảy ra lỗi',
      });
    }
  }, []);

  const pendingCount = orders.filter((order) => order.status === 'SHIPPING').length;
  const deliveredCount = orders.filter((order) => order.status === 'DELIVERED').length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 animate-pulse items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/20">
            <Snowflake className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-sm text-slate-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/20">
            <span className="text-3xl">!</span>
          </div>
          <p className="mb-2 font-semibold text-white">{error}</p>
          <p className="mb-6 text-sm text-slate-400">Nhấn Làm mới để thử lại hoặc liên hệ văn phòng</p>
          <button
            onClick={handleRefresh}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-blue-500 font-semibold text-white transition-colors hover:bg-blue-600"
          >
            <RefreshCw className="h-5 w-5" />
            Làm mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-900/95 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">IceFlow Driver</h1>
              {driver && <p className="text-xs text-slate-400">Tài xế: {driver.name}</p>}
            </div>
          </div>
          <button
            onClick={() => void signOut()}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Đăng xuất"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="mb-1 flex items-center gap-2 text-amber-400">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Chờ giao</span>
          </div>
          <p className="text-2xl font-black text-white">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="mb-1 flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Đã giao</span>
          </div>
          <p className="text-2xl font-black text-white">{deliveredCount}</p>
        </div>
      </div>

      <div className="px-4 pb-3">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Đang tải...' : 'Làm mới'}
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

      <DriverMap orders={orders} isOpen={showMap} onClose={() => setShowMap(false)} />
      <button
        onClick={() => setShowMap(true)}
        className="fixed bottom-4 left-4 right-4 min-h-[48px] rounded-xl bg-blue-500 font-semibold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-600"
      >
        Xem bản đồ
      </button>
      <div className="h-20" />
    </div>
  );
}
