'use client';
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

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
  driverCount: number;
}

interface LogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [factoryError, setFactoryError] = useState<string>('');

  // Filters
  const [selectedFactory, setSelectedFactory] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Build query string for API calls
  const buildQuery = useCallback((pageNum: number) => {
    const params = new URLSearchParams();
    params.set('page', String(pageNum));
    params.set('limit', '20');
    if (selectedFactory) params.set('factoryId', selectedFactory);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return params.toString();
  }, [selectedFactory, startDate, endDate]);

  // Fetch factories for dropdown
  useEffect(() => {
    fetch('/api/admin/factories')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load factories');
        return r.json();
      })
      .then(data => {
        setFactories(data.factories ?? []);
      })
      .catch(err => {
        setFactoryError(err.message);
      });
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const query = buildQuery(pageNum);
      const res = await fetch(`/api/admin/audit-logs?${query}`);
      if (res.ok) {
        const data: LogsResponse = await res.json();
        setLogs(data.logs);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  // Handle filter submit
  const handleFilter = () => {
    setPage(1);
    fetchLogs(1);
  };

  // Export CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedFactory) params.set('factoryId', selectedFactory);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/admin/audit-logs/export?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  // Format date as DD/MM/YYYY HH:mm
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Format amount as VND
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black text-slate-50">Audit Log</h1>
        <p className="text-sm text-slate-400 mt-1">
          Lịch sử thanh toán subscription
        </p>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Factory dropdown */}
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <label className="text-xs text-slate-400">Nhà máy</label>
              <select
                value={selectedFactory}
                onChange={e => setSelectedFactory(e.target.value)}
                className="px-3 py-2 text-sm bg-white/5 border border-white/20 rounded-lg text-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Tất cả</option>
                {factories.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {factoryError && (
                <p className="text-xs text-red-400">{factoryError}</p>
              )}
            </div>

            {/* Start date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Từ ngày</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 text-sm bg-white/5 border border-white/20 rounded-lg text-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* End date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">Đến ngày</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 text-sm bg-white/5 border border-white/20 rounded-lg text-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filter button */}
            <button
              onClick={handleFilter}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Lọc
            </button>

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg">Không có log nào</p>
              <p className="text-slate-500 text-sm mt-2">
                Thử thay đổi bộ lọc hoặc chờ thanh toán mới.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                      Factory
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">
                      Driver Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr
                      key={log.id}
                      className="border-b border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-50">
                        {formatDate(log.confirmedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {log.adminName}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {log.factoryName}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-emerald-400">
                        {formatVND(log.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-slate-300">
                        {log.driverCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-400">
              Trang {page} / {totalPages} — {total} kết quả
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white/5 border border-white/20 rounded-lg text-slate-50 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Trước
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white/5 border border-white/20 rounded-lg text-slate-50 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sau
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
