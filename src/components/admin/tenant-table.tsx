'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Eye, Loader2 } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

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

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: 'bg-[#a0f399]/40', text: 'text-secondary', label: 'Hoạt động' },
    CANCELLED: { bg: 'bg-error-container', text: 'text-error', label: 'Đã tắt' },
    EXPIRED: { bg: 'bg-error-container', text: 'text-error', label: 'Hết hạn' },
    NONE: { bg: 'bg-surface-dim', text: 'text-on-surface-variant', label: 'Chưa có gói' },
  };
  const c = config[status] ?? { bg: 'bg-surface-dim', text: 'text-on-surface-variant', label: status };
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
}

function SortIcon({
  activeField,
  sortDir,
  field,
}: {
  activeField: SortField;
  sortDir: 'asc' | 'desc';
  field: SortField;
}) {
  if (activeField !== field) return null;
  return sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
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

  const title = action === 'extend' ? 'Gia hạn gói thuê bao' : action === 'price' ? 'Sửa giá mỗi tài xế' : 'Đổi trạng thái thuê bao';

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

      const response = await fetch(API_ENDPOINTS.ADMIN.SUBSCRIPTION_DETAIL(factory.subscription.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = json.error ?? 'Không thể cập nhật subscription';
        onError?.(message);
        toast({ type: 'error', title: 'Cập nhật thất bại', message });
        return;
      }

      const result = json?.data !== undefined ? json.data : json;
      const subPayload = result.subscription ?? result;

      const updatedSubscription = {
        ...factory.subscription,
        ...subPayload,
        pricePerDriver: toNullableNumber(subPayload.pricePerDriver),
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
      toast({ type: 'success', title: 'Đã cập nhật thuê bao' });
      onClose();
    } catch {
      const message = 'Network error - please try again';
      onError?.(message);
      toast({ type: 'error', title: 'Cập nhật thất bại', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded border border-outline-variant bg-card p-6 shadow-xl">
        <h2 className="text-base font-bold text-on-surface">{title}</h2>
        <p className="mt-0.5 text-xs text-on-surface-variant">{factory.name}</p>

        {action === 'extend' && (
          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Số ngày gia hạn thêm
            <input
              type="number"
              min={1}
              max={3650}
              value={extendDays}
              onChange={event => setExtendDays(Number(event.target.value))}
              className="mt-1.5 w-full rounded border border-outline-variant bg-card px-3 py-2 text-sm text-on-surface focus:border-[#004a99] outline-none"
            />
          </label>
        )}

        {action === 'price' && (
          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Giá mỗi tài xế (VND/tháng)
            <input
              type="number"
              min={0}
              value={pricePerDriver}
              onChange={event => setPricePerDriver(Number(event.target.value))}
              className="mt-1.5 w-full rounded border border-outline-variant bg-card px-3 py-2 text-sm text-on-surface focus:border-[#004a99] outline-none"
            />
          </label>
        )}

        {action === 'status' && (
          <div className="mt-4 rounded border border-[#004a99]/20 bg-container-high/50 p-3 text-xs text-primary-deep">
            Trạng thái hiện tại: <span className="font-bold text-primary-dark">{factory.subscription?.status}</span>.
            Hành động này sẽ chuyển sang trạng thái{' '}
            <span className="font-bold text-primary-dark">
              {factory.subscription?.status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE'}
            </span>
            .
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="rounded border border-outline-variant px-3.5 py-2 text-xs font-bold text-on-surface-variant hover:bg-container-high"
          >
            HỦY
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded bg-[#004a99] hover:bg-[#00346f] px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-60"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            XÁC NHẬN
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
    const loadFactories = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.ADMIN.FACTORIES);
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          onError?.(json.error ?? 'Không thể tải danh sách nhà máy');
          setFactories([]);
          return;
        }
        const data = json?.data !== undefined ? json.data : json;
        setFactories(data.factories ?? []);
      } catch {
        onError?.('Không thể tải danh sách nhà máy');
        setFactories([]);
      } finally {
        setLoading(false);
      }
    };

    void loadFactories();
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

  const handleCreateTrial = async (factory: Factory) => {
    setRowLoading(factory.id);
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN.FACTORY_DETAIL(factory.id), { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = result.error ?? 'Không thể tạo trial';
        onError?.(message);
        toast({ type: 'error', title: 'Tạo trial thất bại', message });
        return;
      }
      setFactories(current =>
        current.map(item =>
          item.id === factory.id
            ? {
                ...item,
                subscription: {
                  ...result.subscription,
                  pricePerDriver: toNullableNumber(result.subscription.pricePerDriver),
                },
                daysRemaining: 14,
              }
            : item
        )
      );
      toast({ type: 'success', title: 'Đã tạo trial thành công' });
    } catch {
      const message = 'Network error - please try again';
      onError?.(message);
      toast({ type: 'error', title: 'Tạo trial thất bại', message });
    } finally {
      setRowLoading(null);
    }
  };

  const handleImpersonate = async (factory: Factory) => {
    setRowLoading(factory.id);
    try {
      const response = await fetch(API_ENDPOINTS.ADMIN.IMPERSONATE.START(factory.id), { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? 'Không thể impersonate tenant');
      }
      window.location.href =
        '/admin/tenants/' +
        encodeURIComponent(factory.id) +
        '?impersonating=' +
        encodeURIComponent(data.factoryName) +
        '&factoryId=' +
        encodeURIComponent(data.factoryId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể impersonate tenant';
      onError?.(message);
      toast({ type: 'error', title: 'Thao tác thất bại', message });
    } finally {
      setRowLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-accent" />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded border border-outline-variant bg-card shadow-sm">
        <table className="w-full min-w-[1100px] border-collapse table-industrial">
          <thead>
            <tr className="border-b border-outline-variant bg-surface text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
              {[
                ['name', 'Nhà máy'],
                ['status', 'Trạng thái'],
                ['planType', 'Gói'],
                ['daysRemaining', 'Còn lại'],
                ['activeDriverCount', 'Tài xế'],
                ['monthlyAmount', 'Tháng'],
              ].map(([field, label]) => (
                <th
                  key={field}
                  onClick={() => handleSort(field as SortField)}
                  className="cursor-pointer px-4 py-3 text-left hover:text-primary-accent"
                >
                  <span className="inline-flex items-center gap-1">
                    {label}{' '}
                    <SortIcon activeField={sortField} sortDir={sortDir} field={field as SortField} />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left">Thanh toán cuối</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-soft text-sm">
            {sortedFactories.map(factory => {
              const subscription = factory.subscription;
              const status = subscription?.status ?? 'NONE';
              return (
                <tr key={factory.id} className="h-14 hover:bg-container-low transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-on-surface">{factory.name}</div>
                    <div className="text-xs font-mono text-faint">{factory.phone ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-on-surface-variant">{subscription?.planType ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-bold text-on-surface">
                    {factory.daysRemaining !== null ? `${factory.daysRemaining} ngày` : '—'}
                  </td>
                  <td className="px-4 py-3 data-sm font-bold text-primary-accent">{factory.activeDriverCount}</td>
                  <td className="px-4 py-3 data-md font-bold text-secondary">
                    {formatCurrency(factory.monthlyAmount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-faint">{formatDate(factory.lastPaymentAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5 whitespace-nowrap">
                      <Link
                        href={`/admin/tenants/${factory.id}`}
                        className="inline-flex items-center gap-1 rounded border border-outline-variant bg-card px-2 py-1 text-xs font-bold text-primary-deep hover:bg-container-high"
                      >
                        <Eye className="h-3 w-3" />
                        Xem
                      </Link>
                      {!subscription ? (
                        <button
                          onClick={() => handleCreateTrial(factory)}
                          disabled={rowLoading === factory.id}
                          className="rounded bg-[#a0f399]/40 px-2 py-1 text-xs font-bold text-secondary hover:bg-[#a0f399]/60 disabled:opacity-60"
                        >
                          {rowLoading === factory.id ? '...' : 'Tạo trial'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => setModal({ factory, action: 'extend' })}
                            className="rounded bg-container-high px-2 py-1 text-xs font-bold text-primary-accent hover:bg-container-highest"
                          >
                            Gia hạn
                          </button>
                          <button
                            onClick={() => setModal({ factory, action: 'price' })}
                            className="rounded border border-outline-variant bg-card px-2 py-1 text-xs font-bold text-on-surface-variant hover:bg-container-low"
                          >
                            Sửa giá
                          </button>
                          <button
                            onClick={() => setModal({ factory, action: 'status' })}
                            className="rounded bg-tertiary-fixed/50 px-2 py-1 text-xs font-bold text-tertiary-container hover:bg-tertiary-fixed"
                          >
                            {subscription.status === 'ACTIVE' ? 'Tắt' : 'Bật'}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleImpersonate(factory)}
                        disabled={rowLoading === factory.id}
                        className="rounded bg-[#004a99] px-2 py-1 text-xs font-bold text-white hover:bg-[#00346f] disabled:opacity-60 shadow-2xs"
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
        <div className="py-12 text-center text-xs font-bold text-faint">Chưa có nhà máy nào.</div>
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
