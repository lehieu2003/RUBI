'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

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
        const res = await fetch(API_ENDPOINTS.REPORTS.DEBT);
        if (!res.ok) throw new Error('Failed to fetch debt report');
        const json = await res.json();
        const data = json?.data !== undefined ? json.data : json;
        setDebts(Array.isArray(data) ? data : []);
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
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d]">
      <Sidebar />

      <main className="pl-64">
        <div className="p-8 max-w-[1400px]">
          {/* Header */}
          <div className="border-b border-[#c2c6d3] pb-4 mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">Báo Cáo Công Nợ Khách Hàng</h1>
            <p className="text-xs text-[#424751] mt-1">
              {debts.length} khách hàng • Tổng nợ phải thu: <strong className="font-mono text-[#ba1a1a]">{totalOutstanding.toLocaleString('vi-VN')}đ</strong>
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="rounded border border-[#ba1a1a]/30 bg-[#ffdad6]/40 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-[#ba1a1a] flex items-center justify-center text-white">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#ba1a1a] uppercase">Tổng nợ chưa thu</p>
                  <p className="data-lg font-bold text-[#93000a]">{totalOutstanding.toLocaleString('vi-VN')}đ</p>
                </div>
              </div>
            </div>
            <div className="rounded border border-[#1b6d24]/30 bg-[#a0f399]/20 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-[#1b6d24] flex items-center justify-center text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1b6d24] uppercase">Khách đã thanh toán đủ</p>
                  <p className="data-lg font-bold text-[#111c2d]">
                    {debts.filter(d => d.outstandingDebt <= 0).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Debt Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-[#004a99] border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="rounded border border-[#ba1a1a]/30 bg-[#ffdad6]/50 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-[#ba1a1a] mx-auto mb-2" />
              <p className="text-[#93000a] font-bold text-sm">Không thể tải báo cáo</p>
              <p className="text-[#424751] text-xs mt-1">Vui lòng thử lại sau</p>
            </div>
          ) : debts.length === 0 ? (
            <div className="rounded border border-[#1b6d24]/30 bg-[#a0f399]/20 p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-[#1b6d24] mx-auto mb-2" />
              <p className="text-[#1b6d24] font-bold text-sm">Không có công nợ</p>
              <p className="text-[#424751] text-xs mt-1">Tất cả khách hàng đã thanh toán đầy đủ</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded border border-[#c2c6d3] bg-white shadow-sm">
              <table className="w-full text-left border-collapse table-industrial">
                <thead>
                  <tr className="border-b border-[#c2c6d3] bg-[#f9f9ff] text-[12px] font-bold uppercase tracking-wider text-[#424751]">
                    <th className="py-3 px-4">Khách hàng</th>
                    <th className="py-3 px-4 text-right">Dư nợ hiện tại</th>
                    <th className="py-3 px-4 text-right">Lần trả cuối</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7eeff] text-sm">
                  {debts.map((debt) => (
                    <tr key={debt.customerId} className="h-12 hover:bg-[#f0f3ff] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#111c2d]">{debt.customerName}</td>
                      <td className="py-3 px-4 text-right data-md font-bold">
                        <span className={debt.outstandingDebt > 0 ? 'text-[#ba1a1a]' : 'text-[#1b6d24]'}>
                          {debt.outstandingDebt.toLocaleString('vi-VN')}đ
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right data-sm text-[#737783]">
                        {debt.lastPaymentDate ? new Date(debt.lastPaymentDate).toLocaleDateString('vi-VN') : 'Chưa từng trả'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {debt.outstandingDebt > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#ffdad6] text-[#93000a]">
                            Còn nợ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#a0f399]/40 text-[#1b6d24]">
                            Đã tất toán
                          </span>
                        )}
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