'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { History, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Pagination } from '@/components/ui/pagination';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { PaginationMeta } from '@/lib/pagination';

interface AuditLogEntry {
  id: string;
  action: string;
  summary: string;
  userName: string;
  orderId: string | null;
  orderCode: string | null;
  customerId: string | null;
  customerName: string | null;
  createdAt: string;
}

type Filter = '' | 'ORDER' | 'DEBT';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'ORDER', label: 'Đơn hàng' },
  { value: 'DEBT', label: 'Công nợ' },
];

const ACTION_LABELS: Record<string, string> = {
  ORDER_CREATED: 'Lên đơn',
  ORDER_ASSIGNED: 'Gán tài xế',
  ORDER_STATUS_CHANGED: 'Đổi trạng thái',
  ORDER_CANCELLED: 'Hủy đơn',
  ORDER_DELIVERED: 'Đã giao',
  ORDER_SETTLED: 'Chốt đơn',
  DEBT_PAYMENT: 'Thu tiền',
};

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [filter, setFilter] = useState<Filter>('');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: PAGE_SIZE, total_item: 0, total_page: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (filter) query.set('type', filter);
      const res = await fetch(`${API_ENDPOINTS.AUDIT_LOGS}?${query}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? 'Không thể tải nhật ký');
      setEntries(json.data);
      setMeta(json.meta);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải nhật ký');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <div className="border-b border-outline-variant pb-4 mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Nhật Ký Đơn Hàng & Công Nợ</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Ai đã làm gì với đơn hàng và công nợ, lúc nào. Nhật ký chỉ ghi thêm, không sửa và không xoá được.
          </p>
        </div>

        <div className="flex gap-2 mb-4">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                setFilter(item.value);
                setPage(1);
              }}
              aria-pressed={filter === item.value}
              className={
                'px-3.5 py-1.5 rounded text-xs font-bold transition-colors ' +
                (filter === item.value
                  ? 'bg-[#004a99] text-white'
                  : 'bg-container-high text-primary-accent hover:bg-container-highest')
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? (
          <div role="alert" className="rounded border border-error bg-error-container p-4 text-sm text-on-error-container">
            {error}
          </div>
        ) : loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-accent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded border border-outline-variant bg-card p-8 text-center shadow-sm">
            <History className="mx-auto mb-3 h-10 w-10 text-faint" />
            <p className="text-sm font-bold text-on-surface">Chưa có nhật ký nào</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              Các thao tác với đơn hàng và công nợ từ nay sẽ được ghi lại ở đây.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-outline-variant bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-industrial">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="py-3 px-4 whitespace-nowrap">Thời gian</th>
                    <th className="py-3 px-4">Người thực hiện</th>
                    <th className="py-3 px-4">Thao tác</th>
                    <th className="py-3 px-4">Đơn</th>
                    <th className="py-3 px-4">Khách hàng</th>
                    <th className="py-3 px-4">Nội dung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-soft text-sm">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-container-low transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-on-surface-variant whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-on-surface whitespace-nowrap">{entry.userName}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-container-high text-primary-accent">
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                        {entry.orderId ? (
                          <Link href={`/orders/${entry.orderId}`} className="font-bold text-primary-accent hover:underline">
                            {entry.orderCode}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-on-surface">{entry.customerName ?? '—'}</td>
                      <td className="py-3 px-4 text-on-surface">{entry.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={meta} onPageChange={setPage} itemLabel="dòng nhật ký" disabled={loading} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
