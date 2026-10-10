'use client';

import { useEffect, useState, useCallback, use } from 'react';
import DeliveryCard from '@/components/driver/DeliveryCard';
import EmptyState from '@/components/driver/EmptyState';
import { Snowflake, RefreshCw, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

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
}

interface DriverViewPageProps {
  params: Promise<{ token: string }>;
}

export default function DriverViewPage({ params }: DriverViewPageProps) {
  const { token } = use(params);
  const [orders, setOrders] = useState<Order[]>([]);
  const [driverName, setDriverName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`/api/d/${token}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Link không hợp lệ hoặc đã hết hạn');
        }
        throw new Error('Không thể tải danh sách đơn hàng');
      }
      const data = await response.json();
      setOrders(data.orders || []);
      setDriverName(data.driverName || 'Tài xế');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOrders();
  };

  const handleConfirm = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'DELIVERED' as const } : o))
    );

    try {
      const response = await fetch(API_ENDPOINTS.ORDERS.CONFIRM(orderId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Không thể xác nhận');
      }
    } catch (err) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'SHIPPING' as const } : o))
      );
      toast({
        type: 'error',
        title: 'Không thể xác nhận đơn hàng',
        message: err instanceof Error ? err.message : 'Đã xảy ra lỗi',
      });
    }
  };

  const pendingCount = orders.filter((o) => o.status === 'SHIPPING').length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;

  if (loading || !token) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded bg-[#004a99] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Snowflake className="h-6 w-6 text-[#9bbdff]" />
          </div>
          <p className="text-xs font-bold text-primary-deep">Đang tải danh sách đơn...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-card p-6 rounded border border-outline-variant shadow-sm">
          <AlertCircle className="h-12 w-12 text-error mx-auto mb-3" />
          <p className="text-sm font-bold text-on-surface mb-1">{error}</p>
          <p className="text-xs text-on-surface-variant mb-5">
            Nhấn Làm mới để thử lại hoặc liên hệ văn phòng nhà máy
          </p>
          <button
            onClick={handleRefresh}
            className="w-full py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-2 shadow-sm"
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
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#00346f] border-b border-[#002754] px-4 py-3.5 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded bg-[#004a99] flex items-center justify-center">
              <Snowflake className="h-5 w-5 text-[#9bbdff]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">IceFlow Driver</h1>
              <p className="text-xs text-[#9bbdff] font-medium">{driverName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 bg-[#004a99] hover:bg-[#002754] text-white rounded transition-colors disabled:opacity-50"
              aria-label="Làm mới danh sách"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4 pb-20">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-card rounded border border-outline-variant p-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-tertiary-container mb-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Chờ giao</span>
            </div>
            <p className="text-2xl font-bold text-on-surface">{pendingCount}</p>
          </div>
          <div className="bg-card rounded border border-outline-variant p-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-secondary mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Đã giao</span>
            </div>
            <p className="text-2xl font-bold text-on-surface">{deliveredCount}</p>
          </div>
        </div>

        {/* Order List */}
        {orders.length === 0 ? (
          <EmptyState driverName={driverName} onRefresh={handleRefresh} />
        ) : (
          <div className="space-y-3">
            {orders.map((order, orderIndex) => (
              <DeliveryCard
                key={order.id}
                order={order}
                index={orderIndex + 1}
                onConfirm={handleConfirm}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
