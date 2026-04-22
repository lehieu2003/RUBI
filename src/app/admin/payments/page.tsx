'use client';

import { useCallback, useEffect, useState } from 'react';
import { Filter, Loader2 } from 'lucide-react';

interface Factory {
  id: string;
  name: string;
}

interface Payment {
  id: string;
  confirmedAt: string;
  amount: number;
  adminName: string;
  factoryName: string;
  subscriptionId: string | null;
  driverCount: number | null;
  pricePerDriver: number | null;
  source: string;
  notes: string | null;
}

interface PaymentsResponse {
  payments: Payment[];
  total: number;
  page: number;
  totalPages: number;
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN');
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [selectedFactory, setSelectedFactory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/factories')
      .then(response => response.json())
      .then(data => setFactories(data.factories ?? []))
      .catch(() => setFactories([]));
  }, []);

  const fetchPayments = useCallback(async (pageNum: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(pageNum));
    params.set('limit', '20');
    if (selectedFactory) params.set('factoryId', selectedFactory);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    try {
      const response = await fetch(`/api/admin/payments?${params.toString()}`);
      if (response.ok) {
        const data: PaymentsResponse = await response.json();
        setPayments(data.payments);
        setPage(data.page);
        setTotalPages(data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [endDate, selectedFactory, startDate]);

  useEffect(() => {
    fetchPayments(page);
  }, [fetchPayments, page]);

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-400">Super Admin</p>
        <h1 className="mt-1 text-3xl font-black text-white">Thanh toán</h1>
        <p className="mt-2 text-slate-400">
          Lịch sử payment đã ghi nhận từ tenant self-upgrade và override của Super Admin.
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
              fetchPayments(1);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Filter className="h-4 w-4" />
            Lọc
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Ngày</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Nhà máy</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Admin</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">Drivers</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <tr key={payment.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3 text-sm text-slate-300">{formatDate(payment.confirmedAt)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-white">{payment.factoryName}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{payment.adminName}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-emerald-400">{formatCurrency(payment.amount)}</td>
                  <td className="px-4 py-3 text-center text-sm text-slate-300">{payment.driverCount ?? '-'}</td>
                  <td className="px-4 py-3 text-sm text-blue-300">{payment.source}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{payment.notes ?? '-'}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">Chưa có payment.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>Trang {page} / {Math.max(1, totalPages)}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(current => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="rounded-lg bg-white/5 px-3 py-2 disabled:opacity-50"
          >
            Trước
          </button>
          <button
            onClick={() => setPage(current => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
            className="rounded-lg bg-white/5 px-3 py-2 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
