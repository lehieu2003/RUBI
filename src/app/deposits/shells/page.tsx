'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Plus, ArrowDownToLine, ArrowUpFromLine, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { exportToCSV } from '@/lib/export-excel';

interface DepositRecord {
  customerId: string;
  customerName: string;
  shellsOut: number;
  shellsIn: number;
  depositPerShell: number;
  netDepositOwed: number;
}

interface Customer {
  id: string;
  name: string;
}

export default function ShellDepositsPage() {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [shellsOut, setShellsOut] = useState('');
  const [shellsIn, setShellsIn] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [depositsRes, customersRes] = await Promise.all([
          fetch(API_ENDPOINTS.DEPOSITS.SHELLS),
          fetch(API_ENDPOINTS.CUSTOMERS.BASE),
        ]);
        if (!depositsRes.ok) throw new Error('Failed to fetch deposits');
        const depJson = await depositsRes.json();
        const depData = depJson?.data !== undefined ? depJson.data : depJson;
        setDeposits(Array.isArray(depData) ? depData : []);
        if (customersRes.ok) {
          const custJson = await customersRes.json();
          const custData = custJson?.data !== undefined ? custJson.data : custJson;
          setAllCustomers(Array.isArray(custData) ? custData : []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast({ type: 'error', title: 'Vui lòng chọn khách hàng' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API_ENDPOINTS.DEPOSITS.SHELLS, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer,
          shellsOut: shellsOut ? parseInt(shellsOut) : undefined,
          shellsIn: shellsIn ? parseInt(shellsIn) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record');
      }
      // Refresh deposits
      const refreshRes = await fetch(API_ENDPOINTS.DEPOSITS.SHELLS);
      if (refreshRes.ok) {
        const refreshJson = await refreshRes.json();
        setDeposits(refreshJson?.data !== undefined ? refreshJson.data : refreshJson);
      }
      setIsModalOpen(false);
      setSelectedCustomer('');
      setShellsOut('');
      setShellsIn('');
      toast({ type: 'success', title: 'Đã ghi nhận giao dịch vỏ bao' });
    } catch (err) {
      toast({ type: 'error', title: 'Lỗi', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalOwedByCustomers = deposits.reduce((sum, d) => sum + Math.max(0, d.netDepositOwed), 0);
  const totalOwedToCustomers = deposits.reduce((sum, d) => sum + Math.min(0, d.netDepositOwed), 0);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Theo Dõi Vỏ Bao & Cọc Vỏ</h1>
            <p className="text-xs text-on-surface-variant mt-1">
              {deposits.length} khách hàng có ghi nhận giao dịch vỏ bao
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {deposits.length > 0 && (
              <button
                onClick={() => {
                  const headers = ['Mã khách hàng', 'Tên khách hàng', 'Vỏ xuất', 'Vỏ thu', 'Đang nợ vỏ', 'Tiền cọc nợ (VND)'];
                  const rows = deposits.map(d => [
                    d.customerId,
                    d.customerName,
                    d.shellsOut,
                    d.shellsIn,
                    d.shellsOut - d.shellsIn,
                    d.netDepositOwed,
                  ]);
                  exportToCSV('Theo_Doi_Vo_Bao', headers, rows);
                }}
                className="flex items-center gap-2 px-3.5 py-2.5 border border-outline-variant bg-card hover:bg-container-high text-primary-deep font-bold text-xs rounded transition-all shadow-sm"
              >
                <Download className="h-4 w-4" />
                XUẤT CSV
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              THÊM GIAO DỊCH VỎ
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded border border-tertiary-container/30 bg-tertiary-fixed/40 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-[#7f3700] flex items-center justify-center text-white">
                <ArrowUpFromLine className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-tertiary-container uppercase">Tiền cọc khách còn nợ</p>
                <p className="data-lg font-bold text-tertiary-container">{totalOwedByCustomers.toLocaleString('vi-VN')}đ</p>
              </div>
            </div>
          </div>
          <div className="rounded border border-[#004a99]/30 bg-container-high p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-[#004a99] flex items-center justify-center text-white">
                <ArrowDownToLine className="h-5 w-5 text-[#9bbdff]" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary-deep uppercase">Tiền cọc nhà máy giữ thừa</p>
                <p className="data-lg font-bold text-primary-deep">{Math.abs(totalOwedToCustomers).toLocaleString('vi-VN')}đ</p>
              </div>
            </div>
          </div>
        </div>

        {/* Deposits Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-accent" />
          </div>
        ) : error ? (
          <div className="rounded border border-[#ba1a1a]/30 bg-error-container/50 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-error mx-auto mb-2" />
            <p className="text-on-error-container font-bold text-sm">Không thể tải dữ liệu</p>
            <p className="text-on-surface-variant text-xs mt-1">Vui lòng thử lại sau</p>
          </div>
        ) : deposits.length === 0 ? (
          <div className="rounded border border-[#1b6d24]/30 bg-[#a0f399]/20 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-secondary mx-auto mb-2" />
            <p className="text-secondary font-bold text-sm">Chưa có giao dịch vỏ bao</p>
            <p className="text-on-surface-variant text-xs mt-1">Bắt đầu bằng cách thêm giao dịch đầu tiên</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-outline-variant bg-card shadow-sm">
            <table className="w-full text-left border-collapse table-industrial">
              <thead>
                <tr className="border-b border-outline-variant bg-surface text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4 text-right">Vỏ trả ra (Bao)</th>
                  <th className="py-3 px-4 text-right">Vỏ thu về (Bao)</th>
                  <th className="py-3 px-4 text-right">Đơn giá cọc</th>
                  <th className="py-3 px-4 text-right">Dư nợ cọc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-soft text-sm">
                {deposits.map((deposit) => (
                  <tr key={deposit.customerId} className="h-12 hover:bg-container-low transition-colors">
                    <td className="py-3 px-4 font-bold text-on-surface">{deposit.customerName}</td>
                    <td className="py-3 px-4 text-right data-sm font-bold text-tertiary-container">
                      {deposit.shellsOut > 0 ? deposit.shellsOut : '—'}
                    </td>
                    <td className="py-3 px-4 text-right data-sm font-bold text-primary-accent">
                      {deposit.shellsIn > 0 ? deposit.shellsIn : '—'}
                    </td>
                    <td className="py-3 px-4 text-right data-sm text-faint">
                      {deposit.depositPerShell.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="py-3 px-4 text-right data-md font-bold">
                      <span className={deposit.netDepositOwed > 0 ? 'text-error' : deposit.netDepositOwed < 0 ? 'text-primary-accent' : 'text-faint'}>
                        {Math.abs(deposit.netDepositOwed).toLocaleString('vi-VN')}đ
                        {deposit.netDepositOwed > 0 ? ' (Nợ cọc)' : deposit.netDepositOwed < 0 ? ' (Thừa cọc)' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-outline-variant rounded shadow-xl p-6">
            <h3 className="text-lg font-bold text-on-surface mb-1">Thêm giao dịch vỏ bao</h3>
            <p className="text-on-surface-variant text-xs mb-5">Ghi nhận số lượng vỏ trả ra hoặc thu về từ đại lý</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Khách hàng</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99]"
                >
                  <option value="">Chọn khách hàng...</option>
                  {allCustomers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  <span className="flex items-center gap-1 text-tertiary-container">
                    <ArrowUpFromLine className="h-4 w-4" />
                    Vỏ trả ra (khách nợ nhà máy)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={shellsOut}
                  onChange={(e) => setShellsOut(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99]"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  <span className="flex items-center gap-1 text-primary-accent">
                    <ArrowDownToLine className="h-4 w-4" />
                    Vỏ thu về (nhà máy thu hồi)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={shellsIn}
                  onChange={(e) => setShellsIn(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99]"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant font-bold text-xs rounded hover:bg-container-high transition-colors"
              >
                HỦY
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !selectedCustomer}
                className="flex-1 py-2.5 bg-[#004a99] hover:bg-[#00346f] disabled:opacity-50 text-white font-bold text-xs rounded transition-colors shadow-sm inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                XÁC NHẬN
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}