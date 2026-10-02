'use client';

import { useCallback, useEffect, useState } from 'react';
import { Filter, Loader2 } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface Payment {
  id: string;
  amount: number;
  confirmedAt: string;
  driverCount: number | null;
  source: string;
  notes: string | null;
  factoryName: string;
  adminName: string;
}

interface FactoryOption {
  id: string;
  name: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN');
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [factories, setFactories] = useState<FactoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFactory, setSelectedFactory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const loadFactories = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.ADMIN.FACTORIES);
        const json = await response.json().catch(() => ({}));
        const data = json?.data !== undefined ? json.data : json;
        const factoryList = Array.isArray(data?.factories) ? data.factories : [];
        setFactories(factoryList.map((item: { id: string; name: string }) => ({ id: item.id, name: item.name })));
      } catch {
        setFactories([]);
      }
    };
    void loadFactories();
  }, []);

  const fetchPayments = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', '20');
      if (selectedFactory) params.set('factoryId', selectedFactory);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`${API_ENDPOINTS.ADMIN.PAYMENTS}?${params.toString()}`);
      const json = await response.json().catch(() => ({}));
      const data = json?.data !== undefined ? json.data : json;
      setPayments(Array.isArray(data?.payments) ? data.payments : []);
      setTotalPages(data?.pagination?.totalPages ?? 1);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [endDate, selectedFactory, startDate]);

  useEffect(() => {
    fetchPayments(page);
  }, [fetchPayments, page]);

  return (
    <div>
      <div className="mb-6 border-b border-outline-variant pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">Lịch Sử Giao Dịch & Thanh Toán</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Nhật ký thanh toán phí duy trì gói từ các nhà máy và ghi nhận thủ công của Super Admin.
        </p>
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
            onClick={() => {
              setPage(1);
              fetchPayments(1);
            }}
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
          <table className="w-full min-w-[1000px] border-collapse table-industrial">
            <thead>
              <tr className="border-b border-outline-variant bg-surface text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-4 py-3 text-left">Thời gian</th>
                <th className="px-4 py-3 text-left">Nhà máy</th>
                <th className="px-4 py-3 text-left">Người duyệt</th>
                <th className="px-4 py-3 text-right">Số tiền</th>
                <th className="px-4 py-3 text-center">Tài xế</th>
                <th className="px-4 py-3 text-left">Nguồn</th>
                <th className="px-4 py-3 text-left">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-soft text-sm">
              {(payments ?? []).map(payment => (
                <tr key={payment.id} className="h-12 hover:bg-container-low transition-colors">
                  <td className="px-4 py-3 text-xs text-faint">{formatDate(payment.confirmedAt)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-on-surface">{payment.factoryName}</td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{payment.adminName}</td>
                  <td className="px-4 py-3 text-right data-md font-bold text-secondary">{formatCurrency(payment.amount)}</td>
                  <td className="px-4 py-3 text-center data-sm font-bold text-primary-accent">{payment.driverCount ?? '—'}</td>
                  <td className="px-4 py-3 text-xs font-bold text-primary-accent">{payment.source}</td>
                  <td className="px-4 py-3 text-xs text-faint">{payment.notes ?? '—'}</td>
                </tr>
              ))}
              {(payments ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs font-bold text-faint">Chưa có lịch sử giao dịch.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-on-surface-variant">
        <span>Trang {page} / {Math.max(1, totalPages)}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(current => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="rounded border border-outline-variant bg-card px-3 py-1.5 text-xs font-bold hover:bg-container-high disabled:opacity-40"
          >
            Trang trước
          </button>
          <button
            onClick={() => setPage(current => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            className="rounded border border-outline-variant bg-card px-3 py-1.5 text-xs font-bold hover:bg-container-high disabled:opacity-40"
          >
            Trang sau
          </button>
        </div>
      </div>
    </div>
  );
}
