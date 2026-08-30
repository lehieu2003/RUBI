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
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payment-audit-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-400">Super Admin</p>
        <h1 className="mt-1 text-3xl font-black text-white">Payment Audit Log</h1>
        <p className="mt-2 text-slate-400">
          Lịch sử payment subscription đã được ghi nhận trong 12 tháng gần nhất.
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-col gap-1.5 text-xs text-slate-400">
            Nhà máy
            <select
              value={selectedFactory}
              onChange={event => setSelectedFactory(event.target.value)}
              className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <option value="">Tất cả</option>
              {factories.map(factory => (
                <option key={factory.id} value={factory.id}>{factory.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-slate-400">
            Từ ngày
            <input
              type="date"
              value={startDate}
              onChange={event => setStartDate(event.target.value)}
              className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-slate-400">
            Đến ngày
            <input
              type="date"
              value={endDate}
              onChange={event => setEndDate(event.target.value)}
              className="rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <button
            onClick={() => {
              setPage(1);
              fetchLogs(1);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Filter className="h-4 w-4" />
            Lọc
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Factory</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">Drivers</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Price/Driver</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3 text-sm text-slate-300">{formatDate(log.confirmedAt)}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{log.adminName}</td>
                  <td className="px-4 py-3 text-sm font-medium text-white">{log.factoryName}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-emerald-400">{formatCurrency(log.amount)}</td>
                  <td className="px-4 py-3 text-center text-sm text-slate-300">{log.driverCount ?? '-'}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-300">
                    {log.pricePerDriver !== null ? formatCurrency(log.pricePerDriver) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-blue-300">{log.source}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{log.notes ?? '-'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">Không có log nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>Trang {page} / {Math.max(1, totalPages)} · {total} kết quả</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(current => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </button>
          <button
            onClick={() => setPage(current => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 disabled:opacity-50"
          >
            Sau
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
