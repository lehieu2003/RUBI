'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface DebtRecord {
  customerId: string;
  customerName: string;
  outstandingDebt: number;
  lastPaymentDate: string | null;
}

export default function DebtReportPage() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDebts() {
      try {
        const res = await fetch('/api/reports/debt');
        if (!res.ok) throw new Error('Failed to fetch debt report');
        const data = await res.json();
        setDebts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchDebts();
  }, []);

  const totalOutstanding = debts.reduce((sum, d) => sum + Math.max(0, d.outstandingDebt), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-red-600/10 to-orange-600/10 rounded-full blur-3xl" />
      </div>

      <Sidebar />

      <main className="pl-64">
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">Báo cáo công nợ</h1>
              <p className="text-slate-400 mt-1">
                {debts.length} khách hàng • Tổng nợ: {totalOutstanding.toLocaleString('vi-VN')}đ
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-red-400">Tổng công nợ</p>
                  <p className="text-2xl font-black text-white">{totalOutstanding.toLocaleString('vi-VN')}đ</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-emerald-400">Khách không nợ</p>
                  <p className="text-2xl font-black text-white">
                    {debts.filter(d => d.outstandingDebt <= 0).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Debt Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 font-medium">Không thể tải báo cáo</p>
              <p className="text-slate-400 text-sm mt-1">Vui lòng thử lại sau</p>
            </div>
          ) : debts.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-emerald-400 font-medium">Không có công nợ</p>
              <p className="text-slate-400 text-sm mt-1">Tất cả khách hàng đã trả hết nợ</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-400">Khách hàng</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-400">Công nợ</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-400">Thanh toán cuối</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((debt, idx) => (
                    <tr key={debt.customerId} className={`border-b border-white/5 ${idx !== debts.length - 1 ? '' : 'last:border-0'}`}>
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{debt.customerName}</span>
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${
                        debt.outstandingDebt > 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {debt.outstandingDebt > 0
                          ? `${debt.outstandingDebt.toLocaleString('vi-VN')}đ`
                          : '0đ'}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {debt.lastPaymentDate
                          ? new Date(debt.lastPaymentDate).toLocaleDateString('vi-VN')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}