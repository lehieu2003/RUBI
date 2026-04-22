'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Eye, Loader2 } from 'lucide-react';

interface Factory {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  createdAt: string;
  subscription: {
    id: string;
    planType: string;
    status: string;
    endDate: string;
    driverCount: number;
    pricePerDriver: number | null;
  } | null;
  activeDriverCount: number;
  monthlyAmount: number;
  daysRemaining: number | null;
  lastPaymentAt: string | null;
}

interface TenantTableProps {
  onError?: (message: string) => void;
}

type SortField = 'createdAt' | 'name' | 'status' | 'planType' | 'activeDriverCount' | 'daysRemaining' | 'monthlyAmount';

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Hoạt động' },
    CANCELLED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Đã tắt' },
    EXPIRED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Hết hạn' },
    NONE: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Chưa có gói' },
  };
  const c = config[status] ?? { bg: 'bg-slate-500/20', text: 'text-slate-400', label: status };
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
}

function ActionModal({
  factory,
  action,
  onClose,
  onSaved,
  onError,
}: {
  factory: Factory;
  action: 'extend' | 'price' | 'status';
  onClose: () => void;
  onSaved: (factory: Factory) => void;
  onError?: (message: string) => void;
}) {
  const [extendDays, setExtendDays] = useState(30);
  const [pricePerDriver, setPricePerDriver] = useState(factory.subscription?.pricePerDriver ?? 150000);
  const [loading, setLoading] = useState(false);

  const title = action === 'extend' ? 'Gia hạn subscription' : action === 'price' ? 'Sửa giá mỗi driver' : 'Đổi trạng thái subscription';

  const handleSubmit = async () => {
    if (!factory.subscription || loading) return;
    setLoading(true);
    try {
      const body =
        action === 'extend'
          ? { extendDays, recordPayment: true }
          : action === 'price'
          ? { pricePerDriver }
          : { status: factory.subscription.status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE' };

      const response = await fetch(`/api/admin/subscriptions/${factory.subscription.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        onError?.(result.error ?? 'Không thể cập nhật subscription');
        return;
      }

      const updatedSubscription = {
        ...factory.subscription,
        ...result.subscription,
        pricePerDriver: result.subscription.pricePerDriver
          ? Number(result.subscription.pricePerDriver)
          : null,
      };
      const price = updatedSubscription.pricePerDriver ?? 0;
      const monthlyAmount = Math.max(0, updatedSubscription.driverCount - 1) * price;
      const daysRemaining = Math.ceil(
        (new Date(updatedSubscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      onSaved({
        ...factory,
        subscription: updatedSubscription,
        monthlyAmount,
        daysRemaining,
      });
      onClose();
    } catch {
      onError?.('Network error - please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{factory.name}</p>

        {action === 'extend' && (
          <label className="mt-5 block text-sm text-slate-300">
            Số ngày gia hạn
            <input
              type="number"
              min={1}
              max={3650}
              value={extendDays}
              onChange={event => setExtendDays(Number(event.target.value))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-blue-500/50 focus:outline-none"
            />
          </label>
        )}

        {action === 'price' && (
          <label className="mt-5 block text-sm text-slate-300">
            Giá mỗi driver
            <input
              type="number"
              min={0}
              value={pricePerDriver}
              onChange={event => setPricePerDriver(Number(event.target.value))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-blue-500/50 focus:outline-none"
            />
          </label>
        )}

        {action === 'status' && (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Trạng thái hiện tại là <span className="font-semibold text-white">{factory.subscription?.status}</span>.
            Hành động này sẽ chuyển sang{' '}
            <span className="font-semibold text-white">
              {factory.subscription?.status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE'}
            </span>
            .
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

export function TenantTable({ onError }: TenantTableProps) {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [modal, setModal] = useState<{ factory: Factory; action: 'extend' | 'price' | 'status' } | null>(null);
  const [rowLoading, setRowLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/factories')
      .then(response => response.json())
      .then(data => {
        setFactories(data.factories ?? []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        onError?.('Không thể tải danh sách nhà máy');
      });
  }, [onError]);

  const sortedFactories = useMemo(() => {
    return [...factories].sort((a, b) => {
      const getValue = (factory: Factory): string | number => {
        switch (sortField) {
          case 'name':
            return factory.name;
          case 'status':
            return factory.subscription?.status ?? '';
          case 'planType':
            return factory.subscription?.planType ?? '';
          case 'activeDriverCount':
            return factory.activeDriverCount;
          case 'daysRemaining':
            return factory.daysRemaining ?? -999;
          case 'monthlyAmount':
            return factory.monthlyAmount;
          default:
            return factory.createdAt;
        }
      };
      const aValue = getValue(a);
      const bValue = getValue(b);
      if (aValue < bValue) return sortDir === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [factories, sortDir, sortField]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(current => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const handleCreateTrial = async (factory: Factory) => {
    setRowLoading(factory.id);
    try {
      const response = await fetch(`/api/admin/factories/${factory.id}`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        onError?.(result.error ?? 'Không thể tạo trial');
        return;
      }
      setFactories(current =>
        current.map(item =>
          item.id === factory.id
            ? {
                ...item,
                subscription: {
                  ...result.subscription,
                  pricePerDriver: result.subscription.pricePerDriver
                    ? Number(result.subscription.pricePerDriver)
                    : null,
                },
                daysRemaining: 14,
              }
            : item
        )
      );
    } catch {
      onError?.('Network error - please try again');
    } finally {
      setRowLoading(null);
    }
  };

  const handleImpersonate = async (factory: Factory) => {
    setRowLoading(factory.id);
    try {
      const response = await fetch(`/api/admin/impersonate/${factory.id}`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        window.location.href =
          '/admin/tenants/' +
          encodeURIComponent(factory.id) +
          '?impersonating=' +
          encodeURIComponent(data.factoryName) +
          '&factoryId=' +
          encodeURIComponent(data.factoryId);
      }
    } finally {
      setRowLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-white/10">
              {[
                ['name', 'Nhà máy'],
                ['status', 'Trạng thái'],
                ['planType', 'Gói'],
                ['daysRemaining', 'Còn lại'],
                ['activeDriverCount', 'Drivers'],
                ['monthlyAmount', 'Tháng'],
              ].map(([field, label]) => (
                <th
                  key={field}
                  onClick={() => handleSort(field as SortField)}
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium text-slate-400 hover:text-white"
                >
                  <span className="inline-flex items-center gap-1">
                    {label} {renderSortIcon(field as SortField)}
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Thanh toán cuối</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {sortedFactories.map(factory => {
              const subscription = factory.subscription;
              const status = subscription?.status ?? 'NONE';
              return (
                <tr key={factory.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{factory.name}</div>
                    <div className="text-xs text-slate-400">{factory.phone ?? '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{subscription?.planType ?? '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {factory.daysRemaining !== null ? `${factory.daysRemaining} ngày` : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{factory.activeDriverCount}</td>
                  <td className="px-4 py-3 text-sm font-medium text-emerald-400">
                    {formatCurrency(factory.monthlyAmount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{formatDate(factory.lastPaymentAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/tenants/${factory.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                      >
                        <Eye className="h-3 w-3" />
                        Chi tiết
                      </Link>
                      {!subscription ? (
                        <button
                          onClick={() => handleCreateTrial(factory)}
                          disabled={rowLoading === factory.id}
                          className="rounded-lg bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-60"
                        >
                          {rowLoading === factory.id ? '...' : 'Tạo trial'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setModal({ factory, action: 'extend' })}
                            className="rounded-lg bg-blue-500/20 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/30"
                          >
                            Gia hạn
                          </button>
                          <button
                            onClick={() => setModal({ factory, action: 'price' })}
                            className="rounded-lg bg-slate-500/20 px-2 py-1 text-xs text-slate-300 hover:bg-slate-500/30"
                          >
                            Sửa giá
                          </button>
                          <button
                            onClick={() => setModal({ factory, action: 'status' })}
                            className="rounded-lg bg-amber-500/20 px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/30"
                          >
                            {subscription.status === 'ACTIVE' ? 'Tắt' : 'Kích hoạt'}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleImpersonate(factory)}
                        disabled={rowLoading === factory.id}
                        className="rounded-lg bg-violet-500/20 px-2 py-1 text-xs text-violet-400 hover:bg-violet-500/30 disabled:opacity-60"
                      >
                        Hỗ trợ
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {factories.length === 0 && (
        <div className="py-12 text-center text-slate-400">Chưa có nhà máy nào.</div>
      )}

      {modal && (
        <ActionModal
          factory={modal.factory}
          action={modal.action}
          onClose={() => setModal(null)}
          onError={onError}
          onSaved={updated => setFactories(current => current.map(item => (item.id === updated.id ? updated : item)))}
        />
      )}
    </>
  );
}
