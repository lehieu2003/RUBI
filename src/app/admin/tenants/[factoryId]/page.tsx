'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CreditCard, Loader2, Users } from 'lucide-react';

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
      const response = await fetch(`/api/admin/factories/${params.factoryId}`);
      if (!response.ok) throw new Error('Không thể tải tenant');
      const result = await response.json();
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
      const response = await fetch(`/api/admin/subscriptions/${data.subscription.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? 'Không thể cập nhật subscription');
        return;
      }
      await loadTenant();
    } catch {
      setError('Network error - please try again');
    } finally {
      setActionLoading(false);
    }
  };

  const impersonate = async () => {
    if (!data) return;
    const response = await fetch(`/api/admin/impersonate/${data.factory.id}`, { method: 'POST' });
    if (response.ok) {
      const result = await response.json();
      window.location.href =
        `/admin/tenants/${encodeURIComponent(data.factory.id)}?impersonating=${encodeURIComponent(result.factoryName)}&factoryId=${encodeURIComponent(result.factoryId)}`;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-400">Nhà máy</p>
          <h1 className="mt-1 text-3xl font-black text-white">{data.factory.name}</h1>
          <p className="mt-2 text-slate-400">{data.factory.phone ?? '-'} · {data.factory.address ?? '-'}</p>
        </div>
        <button
          onClick={impersonate}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Impersonate hỗ trợ
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <CreditCard className="h-5 w-5 text-blue-400" />
            Subscription
          </h2>
          {data.subscription ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Gói</span><span className="text-white">{data.subscription.planType}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Trạng thái</span><span className="text-white">{data.subscription.status}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Hết hạn</span><span className="text-white">{formatDate(data.subscription.endDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Còn lại</span><span className="text-white">{data.daysRemaining ?? '-'} ngày</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Drivers</span><span className="text-white">{data.activeDriverCount}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Tháng</span><span className="font-semibold text-emerald-400">{formatCurrency(data.monthlyAmount)}</span></div>

              <div className="border-t border-white/10 pt-4">
                <label className="text-xs text-slate-400">
                  Giá mỗi driver
                  <input
                    type="number"
                    value={pricePerDriver}
                    onChange={event => setPricePerDriver(Number(event.target.value))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => updateSubscription({ extendDays: 30, recordPayment: true })}
                    disabled={actionLoading}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Gia hạn 30 ngày
                  </button>
                  <button
                    onClick={() => updateSubscription({ pricePerDriver })}
                    disabled={actionLoading}
                    className="rounded-lg bg-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                  >
                    Lưu giá
                  </button>
                  <button
                    onClick={() => updateSubscription({ status: data.subscription?.status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE' })}
                    disabled={actionLoading}
                    className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    {data.subscription.status === 'ACTIVE' ? 'Tắt' : 'Kích hoạt'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Tenant chưa có subscription.</p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Users className="h-5 w-5 text-emerald-400" />
            Vận hành
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Users</span><span className="text-white">{data.usersCount}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Staff</span><span className="text-white">{data.staffCount}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Orders 30 ngày</span><span className="text-white">{data.totalOrders}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Pending</span><span className="text-white">{data.pendingOrders}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Thanh toán cuối</span><span className="text-white">{formatDate(data.lastPaymentAt)}</span></div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-bold text-white">Nhân sự</h2>
          <div className="mt-4 space-y-3">
            {data.users.slice(0, 5).map(user => (
              <div key={user.id} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
                <span className="rounded bg-white/10 px-2 py-1 text-xs text-slate-300">{user.role}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-bold text-white">Recent payments</h2>
          <div className="mt-4 space-y-3">
            {data.recentPayments.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có payment.</p>
            ) : data.recentPayments.map(payment => (
              <div key={payment.id} className="flex justify-between border-b border-white/5 pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium text-white">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-slate-400">{payment.adminName} · {payment.notes ?? '-'}</p>
                </div>
                <span className="text-slate-400">{formatDate(payment.confirmedAt)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-bold text-white">Recent orders</h2>
          <div className="mt-4 space-y-3">
            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-slate-400">Không có order 30 ngày gần đây.</p>
            ) : data.recentOrders.map(order => (
              <div key={order.id} className="flex justify-between border-b border-white/5 pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium text-white">{order.customerName}</p>
                  <p className="text-xs text-slate-400">{order.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400">{formatCurrency(order.total)}</p>
                  <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
