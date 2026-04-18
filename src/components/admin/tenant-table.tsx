'use client';
import { useEffect, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react';

// Types
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
    pricePerDriver: number;
  } | null;
  activeDriverCount: number;
}

interface TenantTableProps {
  onError?: (message: string) => void;
}

// Helper function
function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Đang hoạt động' },
    TRIAL: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Dùng thử' },
    CANCELLED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Đã hủy' },
    EXPIRED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Đã hết hạn' },
  };
  const c = config[status] ?? { bg: 'bg-slate-500/20', text: 'text-slate-400', label: status };
  return (
    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// Row actions component with inline extend input
function RowActions({
  factory,
  onUpdate,
}: {
  factory: Factory;
  onUpdate: (updated: Factory) => void;
}) {
  const [showExtend, setShowExtend] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [showPriceEdit, setShowPriceEdit] = useState(false);
  const [newPrice, setNewPrice] = useState(factory.subscription?.pricePerDriver ?? 150000);
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string, body?: Record<string, unknown>) => {
    if (!factory.subscription) return;
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/subscriptions/${factory.subscription.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      if (res.ok) {
        const data = await res.json();
        // Optimistic update
        onUpdate({
          ...factory,
          subscription: { ...factory.subscription, ...data.subscription },
        });
      }
    } finally {
      setLoading(null);
      if (action === 'extend') setShowExtend(false);
      if (action === 'price') setShowPriceEdit(false);
    }
  };

  const isActive = factory.subscription?.status === 'ACTIVE';

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex gap-1">
        {isActive ? (
          <button
            onClick={() => handleAction('deactivate', { status: 'CANCELLED' })}
            disabled={loading === 'deactivate'}
            className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
          >
            {loading === 'deactivate' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Tắt'}
          </button>
        ) : (
          <button
            onClick={() => handleAction('activate', { status: 'ACTIVE' })}
            disabled={loading === 'activate'}
            className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {loading === 'activate' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Kích hoạt'}
          </button>
        )}
        <button
          onClick={() => setShowExtend(!showExtend)}
          className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
        >
          Gia hạn
        </button>
        <button
          onClick={() => setShowPriceEdit(!showPriceEdit)}
          className="px-2 py-1 text-xs rounded bg-slate-500/20 text-slate-400 hover:bg-slate-500/30"
        >
          Sửa giá
        </button>
        <button
          onClick={async () => {
            setLoading('impersonate');
            try {
              const res = await fetch(`/api/admin/impersonate/${factory.id}`, { method: 'POST' });
              if (res.ok) {
                const data = await res.json();
                window.location.href = '/admin/dashboard?impersonating=' + encodeURIComponent(data.factoryName) + '&factoryId=' + encodeURIComponent(data.factoryId);
              }
            } finally {
              setLoading(null);
            }
          }}
          disabled={loading === 'impersonate'}
          className="px-2 py-1 text-xs rounded bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 disabled:opacity-50"
        >
          {loading === 'impersonate' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Xem'}
        </button>
      </div>

      {/* Inline extend input */}
      {showExtend && (
        <div className="flex gap-1 items-center">
          <input
            type="number"
            value={extendDays}
            onChange={e => setExtendDays(Number(e.target.value))}
            placeholder="Số ngày"
            className="w-20 px-2 py-1 text-xs bg-white/5 border border-white/20 rounded text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => handleAction('extend', { extendDays })}
            disabled={loading === 'extend'}
            className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            Xác nhận
          </button>
          <button
            onClick={() => setShowExtend(false)}
            className="px-2 py-1 text-xs rounded bg-slate-500/20 text-slate-400 hover:bg-slate-500/30"
          >
            Hủy
          </button>
        </div>
      )}

      {/* Inline price edit */}
      {showPriceEdit && (
        <div className="flex gap-1 items-center">
          <input
            type="number"
            value={newPrice}
            onChange={e => setNewPrice(Number(e.target.value))}
            placeholder="Giá mỗi tài xế"
            className="w-28 px-2 py-1 text-xs bg-white/5 border border-white/20 rounded text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={() => handleAction('price', { pricePerDriver: newPrice })}
            disabled={loading === 'price'}
            className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            Xác nhận
          </button>
          <button
            onClick={() => setShowPriceEdit(false)}
            className="px-2 py-1 text-xs rounded bg-slate-500/20 text-slate-400 hover:bg-slate-500/30"
          >
            Hủy
          </button>
        </div>
      )}
    </div>
  );
}

// Main component
export function TenantTable({ onError }: TenantTableProps) {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetch('/api/admin/factories')
      .then(r => r.json())
      .then(data => {
        setFactories(data.factories ?? []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        onError?.('Không thể tải danh sách nhà máy');
      });
  }, [onError]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedFactories = [...factories].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';
    switch (sortField) {
      case 'name': aVal = a.name; bVal = b.name; break;
      case 'status': aVal = a.subscription?.status ?? ''; bVal = b.subscription?.status ?? ''; break;
      case 'planType': aVal = a.subscription?.planType ?? ''; bVal = b.subscription?.planType ?? ''; break;
      case 'driverCount': aVal = a.activeDriverCount; bVal = b.activeDriverCount; break;
      case 'daysRemaining':
        aVal = a.subscription ? getDaysRemaining(a.subscription.endDate) : -1;
        bVal = b.subscription ? getDaysRemaining(b.subscription.endDate) : -1;
        break;
      default: aVal = a.createdAt; bVal = b.createdAt;
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (factories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 text-lg">Chưa có nhà máy nào</p>
        <p className="text-slate-500 text-sm mt-2">Các nhà máy sẽ xuất hiện khi họ đăng ký sử dụng IceFlow.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th
              className="px-4 py-3 text-left text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-1">
                Nhà máy <SortIcon field="name" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-center text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200"
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center justify-center gap-1">
                Trạng thái <SortIcon field="status" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-center text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200"
              onClick={() => handleSort('planType')}
            >
              <div className="flex items-center justify-center gap-1">
                Gói <SortIcon field="planType" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-center text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200"
              onClick={() => handleSort('driverCount')}
            >
              <div className="flex items-center justify-center gap-1">
                Tài xế <SortIcon field="driverCount" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-center text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-200"
              onClick={() => handleSort('daysRemaining')}
            >
              <div className="flex items-center justify-center gap-1">
                Còn lại <SortIcon field="daysRemaining" />
              </div>
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedFactories.map(factory => {
            const daysLeft = factory.subscription
              ? getDaysRemaining(factory.subscription.endDate)
              : null;
            return (
              <tr
                key={factory.id}
                className="border-b border-white/10 hover:bg-white/10 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-slate-50">{factory.name}</div>
                  <div className="text-xs text-slate-400">{factory.phone ?? '-'}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={factory.subscription?.status ?? 'EXPIRED'} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-slate-300">
                    {factory.subscription?.planType ?? '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-slate-300">
                    {factory.activeDriverCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm ${daysLeft !== null && daysLeft <= 7 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {daysLeft !== null ? `${daysLeft} ngày` : '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <RowActions
                    factory={factory}
                    onUpdate={updated => {
                      setFactories(prev =>
                        prev.map(f => f.id === updated.id ? updated : f)
                      );
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
