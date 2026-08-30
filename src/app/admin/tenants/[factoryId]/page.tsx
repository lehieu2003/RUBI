'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CreditCard, Loader2, Users, Building2, Calendar, ShoppingBag } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface TenantDetail {
  factory: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    createdAt: string;
  };
  subscription: {
    id: string;
    planType: string;
    status: string;
    startDate: string;
    endDate: string;
    driverCount: number;
    pricePerDriver: number | null;
  } | null;
  activeDriverCount: number;
  usersCount: number;
  staffCount: number;
  monthlyAmount: number;
  daysRemaining: number | null;
  lastPaymentAt: string | null;
  totalOrders: number;
  pendingOrders: number;
  recentPayments: Array<{
    id: string;
    amount: number;
    confirmedAt: string;
    adminName: string;
    notes: string | null;
  }>;
  recentOrders: Array<{
    id: string;
    status: string;
    total: number;
    createdAt: string;
    customerName: string;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }>;
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

export default function AdminTenantDetailPage() {
  const params = useParams<{ factoryId: string }>();
  const [data, setData] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pricePerDriver, setPricePerDriver] = useState(150000);
  const [error, setError] = useState<string | null>(null);

  const loadTenant = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN.FACTORY_DETAIL(params.factoryId as string));
      if (!response.ok) throw new Error('Không thể tải tenant');
      const json = await response.json();
      const result = json?.data !== undefined ? json.data : json;
      setData(result);
      setPricePerDriver(result.subscription?.pricePerDriver ?? 150000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải tenant');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.factoryId]);

  const updateSubscription = async (body: Record<string, unknown>) => {
    if (!data?.subscription || actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN.SUBSCRIPTION_DETAIL(data.subscription.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = json.error ?? 'Không thể cập nhật subscription';
        setError(message);
        toast({ type: 'error', title: 'Cập nhật thất bại', message });
        return;
      }
      toast({ type: 'success', title: 'Đã cập nhật thuê bao' });
      await loadTenant();
    } catch {
      const message = 'Network error - please try again';
      setError(message);
      toast({ type: 'error', title: 'Cập nhật thất bại', message });
    } finally {
      setActionLoading(false);
    }
  };

  const impersonate = async () => {
    if (!data) return;
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN.IMPERSONATE.START(data.factory.id), { method: 'POST' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? 'Không thể impersonate');
      }
      const result = json?.data !== undefined ? json.data : json;
      window.location.href =
        `/admin/tenants/${encodeURIComponent(data.factory.id)}?impersonating=${encodeURIComponent(result.factoryName)}&factoryId=${encodeURIComponent(result.factoryId)}`;
    } catch (err) {
      toast({
        type: 'error',
        title: 'Thao tác thất bại',
        message: err instanceof Error ? err.message : 'Không thể impersonate',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#004a99]" />
      </div>
    );
  }

  if (!data) {
    return <div className="rounded border border-[#ba1a1a]/30 bg-[#ffdad6]/50 p-4 text-xs font-bold text-[#93000a]">{error}</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[#c2c6d3] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">{data.factory.name}</h1>
          <p className="mt-1 text-xs text-[#424751]">
            Điện thoại: <span className="font-mono font-bold text-[#111c2d]">{data.factory.phone ?? '—'}</span> · Địa chỉ: {data.factory.address ?? '—'}
          </p>
        </div>
        <button
          onClick={impersonate}
          className="rounded bg-[#004a99] hover:bg-[#00346f] px-4 py-2 text-xs font-bold text-white shadow-2xs transition-colors"
        >
          HỖ TRỢ TRỰC TIẾP (IMPERSONATE)
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded border border-[#ba1a1a]/30 bg-[#ffdad6]/50 p-4 text-xs font-bold text-[#93000a]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Subscription */}
        <section className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#111c2d]">
            <CreditCard className="h-4 w-4 text-[#004a99]" />
            Gói Thuê Bao & Cấu Hình
          </h2>
          {data.subscription ? (
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between"><span className="text-[#737783]">Loại gói</span><span className="font-bold text-[#111c2d]">{data.subscription.planType}</span></div>
              <div className="flex justify-between"><span className="text-[#737783]">Trạng thái</span><span className="font-bold text-[#1b6d24]">{data.subscription.status}</span></div>
              <div className="flex justify-between"><span className="text-[#737783]">Hết hạn ngày</span><span className="font-medium text-[#111c2d]">{formatDate(data.subscription.endDate)}</span></div>
              <div className="flex justify-between"><span className="text-[#737783]">Thời gian còn lại</span><span className="font-bold text-[#004a99]">{data.daysRemaining ?? '—'} ngày</span></div>
              <div className="flex justify-between"><span className="text-[#737783]">Số tài xế active</span><span className="font-bold text-[#004a99]">{data.activeDriverCount}</span></div>
              <div className="flex justify-between"><span className="text-[#737783]">Mức phí / tháng</span><span className="font-bold text-[#1b6d24]">{formatCurrency(data.monthlyAmount)}</span></div>

              <div className="border-t border-[#e7eeff] pt-3 mt-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#424751]">
                  Giá mỗi tài xế
                  <input
                    type="number"
                    value={pricePerDriver}
                    onChange={event => setPricePerDriver(Number(event.target.value))}
                    className="mt-1.5 w-full rounded border border-[#c2c6d3] bg-white px-3 py-1.5 text-xs text-[#111c2d] focus:border-[#004a99] outline-none"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => updateSubscription({ extendDays: 30, recordPayment: true })}
                    disabled={actionLoading}
                    className="rounded bg-[#dee8ff] hover:bg-[#c2d7ff] px-3 py-1.5 text-xs font-bold text-[#004a99] disabled:opacity-60"
                  >
                    +30 ngày
                  </button>
                  <button
                    onClick={() => updateSubscription({ pricePerDriver })}
                    disabled={actionLoading}
                    className="rounded border border-[#c2c6d3] bg-white hover:bg-[#f0f3ff] px-3 py-1.5 text-xs font-bold text-[#424751] disabled:opacity-60"
                  >
                    Lưu giá
                  </button>
                  <button
                    onClick={() => updateSubscription({ status: data.subscription?.status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE' })}
                    disabled={actionLoading}
                    className="rounded bg-[#ffdcc2]/50 hover:bg-[#ffdcc2] px-3 py-1.5 text-xs font-bold text-[#7f3700] disabled:opacity-60"
                  >
                    {data.subscription.status === 'ACTIVE' ? 'Tắt' : 'Bật'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-[#737783]">Nhà máy chưa khởi tạo gói thuê bao.</p>
          )}
        </section>

        {/* Operation Stats */}
        <section className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#111c2d]">
            <Users className="h-4 w-4 text-[#1b6d24]" />
            Chỉ Số Vận Hành
          </h2>
          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex justify-between"><span className="text-[#737783]">Tổng tài khoản</span><span className="font-bold text-[#111c2d]">{data.usersCount}</span></div>
            <div className="flex justify-between"><span className="text-[#737783]">Nhân viên VP</span><span className="font-bold text-[#111c2d]">{data.staffCount}</span></div>
            <div className="flex justify-between"><span className="text-[#737783]">Đơn hàng 30 ngày</span><span className="font-bold text-[#004a99]">{data.totalOrders}</span></div>
            <div className="flex justify-between"><span className="text-[#737783]">Đơn đang xử lý</span><span className="font-bold text-[#7f3700]">{data.pendingOrders}</span></div>
            <div className="flex justify-between"><span className="text-[#737783]">Lần thanh toán cuối</span><span className="font-medium text-[#111c2d]">{formatDate(data.lastPaymentAt)}</span></div>
          </div>
        </section>

        {/* Personnel */}
        <section className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#111c2d] mb-4">Danh Sách Nhân Sự</h2>
          <div className="space-y-2.5">
            {data.users.slice(0, 5).map(user => (
              <div key={user.id} className="flex items-center justify-between border-b border-[#e7eeff] pb-2 last:border-0 text-xs">
                <div>
                  <p className="font-bold text-[#111c2d]">{user.name}</p>
                  <p className="text-[11px] text-[#737783]">{user.email}</p>
                </div>
                <span className="rounded bg-[#dee8ff] px-2 py-0.5 font-bold text-[#004a99]">{user.role}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent Payments */}
        <section className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#111c2d] mb-3">Lịch Sử Thanh Toán Gần Đây</h2>
          <div className="space-y-2.5">
            {data.recentPayments.length === 0 ? (
              <p className="text-xs text-[#737783]">Chưa có thanh toán nào được ghi nhận.</p>
            ) : data.recentPayments.map(payment => (
              <div key={payment.id} className="flex justify-between border-b border-[#e7eeff] pb-2 text-xs last:border-0">
                <div>
                  <p className="font-bold text-[#1b6d24]">{formatCurrency(payment.amount)}</p>
                  <p className="text-[11px] text-[#737783]">{payment.adminName} · {payment.notes ?? '—'}</p>
                </div>
                <span className="text-[#737783]">{formatDate(payment.confirmedAt)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Orders */}
        <section className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#111c2d] mb-3">Đơn Hàng Gần Đây</h2>
          <div className="space-y-2.5">
            {data.recentOrders.length === 0 ? (
              <p className="text-xs text-[#737783]">Không có đơn hàng trong 30 ngày gần đây.</p>
            ) : data.recentOrders.map(order => (
              <div key={order.id} className="flex justify-between border-b border-[#e7eeff] pb-2 text-xs last:border-0">
                <div>
                  <p className="font-bold text-[#111c2d]">{order.customerName}</p>
                  <p className="text-[11px] font-bold text-[#004a99]">{order.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#111c2d]">{formatCurrency(order.total)}</p>
                  <p className="text-[11px] text-[#737783]">{formatDate(order.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
