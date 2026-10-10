'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { exportToCSV } from '@/lib/export-excel';

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
        if (!res.ok) throw new Error('Không thể tải báo cáo công nợ');
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

  const handleExport = () => {
    const headers = ['Mã khách hàng', 'Tên khách hàng', 'Công nợ hiện tại (VND)', 'Trạng thái', 'Ngày thanh toán cuối'];
    const rows = debts.map((d) => [
      d.customerId,
      d.customerName,
      d.outstandingDebt,
      d.outstandingDebt > 0 ? 'Còn nợ' : 'Đã thanh toán đủ',
      d.lastPaymentDate ? new Date(d.lastPaymentDate).toLocaleDateString('vi-VN') : 'Chưa có',
    ]);
    exportToCSV('Bao_Cao_Cong_No', headers, rows);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Báo Cáo Công Nợ Khách Hàng</h1>
            <p className="text-xs text-on-surface-variant mt-1">
              {debts.length} khách hàng • Tổng nợ phải thu: <strong className="font-mono text-error">{totalOutstanding.toLocaleString('vi-VN')}đ</strong>
            </p>
          </div>
          {debts.length > 0 && (
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-all shadow-sm self-start sm:self-auto"
            >
              <Download className="h-4 w-4" />
              XUẤT EXCEL / CSV
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded border border-[#ba1a1a]/30 bg-error-container/40 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-[#ba1a1a] flex items-center justify-center text-white">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-error uppercase">Tổng nợ chưa thu</p>
                <p className="data-lg font-bold text-on-error-container">{totalOutstanding.toLocaleString('vi-VN')}đ</p>
              </div>
            </div>
          </div>
          <div className="rounded border border-[#1b6d24]/30 bg-[#a0f399]/20 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-[#1b6d24] flex items-center justify-center text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-secondary uppercase">Khách đã thanh toán đủ</p>
                <p className="data-lg font-bold text-on-surface">
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
          <div className="rounded border border-[#ba1a1a]/30 bg-error-container/50 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-error mx-auto mb-2" />
            <p className="text-on-error-container font-bold text-sm">Không thể tải báo cáo</p>
            <p className="text-on-surface-variant text-xs mt-1">Vui lòng thử lại sau</p>
          </div>
        ) : debts.length === 0 ? (
          <div className="rounded border border-[#1b6d24]/30 bg-[#a0f399]/20 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-secondary mx-auto mb-2" />
            <p className="text-secondary font-bold text-sm">Không có công nợ</p>
            <p className="text-on-surface-variant text-xs mt-1">Tất cả khách hàng đã thanh toán đầy đủ</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-outline-variant bg-card shadow-sm">
            <table className="w-full text-left border-collapse table-industrial">
              <thead>
                <tr className="border-b border-outline-variant bg-surface text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4 text-right">Công nợ hiện tại</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Lần thanh toán cuối</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-soft text-sm">
                {debts.map((item) => (
                  <tr key={item.customerId} className="h-12 hover:bg-container-low transition-colors">
                    <td className="py-3 px-4 font-bold text-on-surface">{item.customerName}</td>
                    <td className={`py-3 px-4 text-right data-md font-bold ${
                      item.outstandingDebt > 0 ? 'text-error' : 'text-secondary'
                    }`}>
                      {item.outstandingDebt.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.outstandingDebt > 0 ? (
                        <span className="inline-flex items-center rounded bg-error-container px-2.5 py-0.5 text-xs font-bold text-error">
                          Còn nợ
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded bg-[#a0f399]/40 px-2.5 py-0.5 text-xs font-bold text-secondary">
                          Đã trả đủ
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-faint">
                      {item.lastPaymentDate ? new Date(item.lastPaymentDate).toLocaleDateString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}