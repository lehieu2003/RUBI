'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Filter, Loader2 } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface Factory {
  id: string;
  name: string;
}

interface AuditLog {
  id: string;
  confirmedAt: string;
  amount: number;
  adminName: string;
  factoryName: string;
  driverCount: number | null;
  pricePerDriver: number | null;
  source: string;
  notes: string | null;
}

interface LogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN');
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch(API_ENDPOINTS.ADMIN.FACTORIES)
      .then(response => response.json())
      .then(json => {
        const payload = json?.data !== undefined ? json.data : json;
        setFactories(payload?.factories ?? []);
      })
      .catch(() => setFactories([]));
  }, []);

  const buildQuery = useCallback((pageNum: number) => {
    const params = new URLSearchParams();
    params.set('page', String(pageNum));
    params.set('limit', '20');
    if (selectedFactory) params.set('factoryId', selectedFactory);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return params.toString();
  }, [endDate, selectedFactory, startDate]);

  const fetchLogs = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.ADMIN.AUDIT_LOGS}?${buildQuery(pageNum)}`);
      if (response.ok) {
        const json = await response.json();
        const data: LogsResponse = json?.data !== undefined ? json.data : json;
        setLogs(data?.logs ?? []);
        setPage(data?.page ?? 1);
        setTotalPages(data?.totalPages ?? 1);
        setTotal(data?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedFactory) params.set('factoryId', selectedFactory);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`${API_ENDPOINTS.ADMIN.AUDIT_LOGS_EXPORT}?${params.toString()}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `payment-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Nhật Ký Hệ Thống (Audit Logs)</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Ghi nhận toàn bộ thao tác thanh toán, gia hạn và biến động trạng thái ({total} bản ghi)
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 rounded border border-outline-variant bg-card hover:bg-container-high px-4 py-2 text-xs font-bold text-primary-deep transition-colors shadow-2xs disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          XUẤT FILE CSV
        </button>
      </div>

      <div className="mb-6 rounded border border-outline-variant bg-card p-4 shadow-2xs">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-col gap-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Nhà máy
            <select
              value={selectedFactory}
              onChange={event => setSelectedFactory(event.target.value)}
              className="rounded border border-outline-variant bg-card px-3 py-2 text-xs font-medium text-on-surface focus:border-[#004a99] outline-none"
            >
              <option value="">Tất cả nhà máy</option>
              {factories.map(factory => (
                <option key={factory.id} value={factory.id}>{factory.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Từ ngày
            <input
              type="date"
              value={startDate}
              onChange={event => setStartDate(event.target.value)}
              className="rounded border border-outline-variant bg-card px-3 py-2 text-xs font-medium text-on-surface focus:border-[#004a99] outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Đến ngày
            <input
              type="date"
              value={endDate}
              onChange={event => setEndDate(event.target.value)}
              className="rounded border border-outline-variant bg-card px-3 py-2 text-xs font-medium text-on-surface focus:border-[#004a99] outline-none"
            />
          </label>
          <button
            onClick={() => fetchLogs(1)}
            className="inline-flex items-center gap-1.5 rounded bg-[#004a99] hover:bg-[#00346f] px-4 py-2 text-xs font-bold text-white shadow-2xs transition-colors"
          >
            <Filter className="h-3.5 w-3.5" />
            LỌC DỮ LIỆU
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-outline-variant bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-accent" />
          </div>
        ) : (
          <table className="w-full min-w-[1100px] border-collapse table-industrial">
            <thead>
              <tr className="border-b border-outline-variant bg-surface text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-4 py-3 text-left">Thời gian</th>
                <th className="px-4 py-3 text-left">Nhà máy</th>
                <th className="px-4 py-3 text-left">Tài khoản thực hiện</th>
                <th className="px-4 py-3 text-right">Số tiền</th>
                <th className="px-4 py-3 text-center">Tài xế</th>
                <th className="px-4 py-3 text-right">Đơn giá</th>
                <th className="px-4 py-3 text-left">Nguồn</th>
                <th className="px-4 py-3 text-left">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-soft text-sm">
              {logs.map(log => (
                <tr key={log.id} className="h-12 hover:bg-container-low transition-colors">
                  <td className="px-4 py-3 text-xs text-faint">{formatDate(log.confirmedAt)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-on-surface">{log.factoryName}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{log.adminName}</td>
                  <td className="px-4 py-3 text-right data-md font-bold text-secondary">{formatCurrency(log.amount)}</td>
                  <td className="px-4 py-3 text-center data-sm font-bold text-primary-accent">{log.driverCount ?? '—'}</td>
                  <td className="px-4 py-3 text-right data-sm text-faint">
                    {log.pricePerDriver ? formatCurrency(log.pricePerDriver) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-primary-accent">{log.source}</td>
                  <td className="px-4 py-3 text-xs text-faint">{log.notes ?? '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-xs font-bold text-faint">Không có nhật ký phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-on-surface-variant">
        <span>Trang {page} / {Math.max(1, totalPages)} (Tổng {total} logs)</span>
        <div className="flex gap-2">
          <button
            onClick={() => fetchLogs(page - 1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded border border-outline-variant bg-card px-3 py-1.5 font-bold hover:bg-container-high disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Trước
          </button>
          <button
            onClick={() => fetchLogs(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 rounded border border-outline-variant bg-card px-3 py-1.5 font-bold hover:bg-container-high disabled:opacity-40"
          >
            Sau
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
