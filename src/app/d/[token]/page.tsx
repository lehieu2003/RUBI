'use client';

import { useEffect, useState, useCallback } from 'react';
import { Phone, MapPin, CheckCircle2, Clock, Snowflake, RefreshCw } from 'lucide-react';
import DeliveryCard from '@/components/driver/DeliveryCard';
import EmptyState from '@/components/driver/EmptyState';
import DriverMap from '@/components/driver/DriverMap';
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
  deliveryGps: { lat: number; lng: number } | null;
  customer: Customer;
  orderItems: OrderItem[];
  driverName: string;
}

export default function DriverViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Resolve params
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  // Store token in localStorage and redirect if needed
  useEffect(() => {
    if (!token) return;

    // Store token in localStorage
    localStorage.setItem('driver_token', token);

    // If localStorage has different token than URL, could redirect
    // But for now we trust the URL token
  }, [token]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_ENDPOINTS.DRIVER_APP.ORDERS}?token=${encodeURIComponent(token)}`);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Liên kết không hợp lệ hoặc đã hết hạn');
        }
        throw new Error('Không thể tải đơn hàng');
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
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token, fetchOrders]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  // Handle delivery confirmation
  const handleConfirm = useCallback(async (orderId: string) => {
    // Optimistically update UI
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'DELIVERED' as const } : o))
    );

    try {
      const response = await fetch(API_ENDPOINTS.ORDERS.CONFIRM(orderId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Không thể xác nhận đơn hàng');
      }
    } catch (err) {
      // Revert on error
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'SHIPPING' as const } : o))
      );
      toast({
        type: 'error',
        title: 'Không thể xác nhận đơn hàng',
        message: err instanceof Error ? err.message : 'Đã xảy ra lỗi',
      });
    }
  }, [token]);

  // Calculate stats
  const pendingCount = orders.filter((o) => o.status === 'SHIPPING').length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;

  // Loading state
  if (loading || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Snowflake className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-slate-400 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="h-16 w-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <p className="text-white font-semibold mb-2">{error}</p>
          <p className="text-slate-400 text-sm mb-6">
            Nhấn "Làm mới" để thử lại hoặc liên hệ văn phòng
          </p>
          <button
            onClick={handleRefresh}
            className="w-full min-h-[44px] bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
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
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">IceFlow Driver</h1>
              {driver && <p className="text-xs text-slate-400">Tài xế: {driver.name}</p>}
            </div>
          </div>
          <button
            onClick={() => setShowMap(true)}
            className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium rounded-lg transition-colors"
          >
            Xem bản đồ
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Chờ giao</span>
          </div>
          <p className="text-2xl font-black text-white">{pendingCount}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Đã giao</span>
          </div>
          <p className="text-2xl font-black text-white">{deliveredCount}</p>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="px-4 pb-3">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-full min-h-[44px] bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* Orders List or Empty State */}
      {orders.length === 0 ? (
        <EmptyState driverName={driver?.name || 'Tài xế'} onRefresh={handleRefresh} />
      ) : (
        <div className="p-4 space-y-3">
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

      {/* Driver Map Overlay */}
      <DriverMap
        orders={orders}
        isOpen={showMap}
        onClose={() => setShowMap(false)}
      />

      {/* Bottom padding for mobile */}
      <div className="h-20" />
    </div>
  );
}
