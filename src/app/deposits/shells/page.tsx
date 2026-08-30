'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Package, Plus, ArrowDownToLine, ArrowUpFromLine, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

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
      if (refreshRes.ok) setDeposits(await refreshRes.json());
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-600/10 to-orange-600/10 rounded-full blur-3xl" />
      </div>

      <Sidebar />

      <main className="pl-64">
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">Theo dõi vỏ bao</h1>
              <p className="text-slate-400 mt-1">
                {deposits.length} khách hàng có giao dịch vỏ bao
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors"
            >
              <Plus className="h-5 w-5" />
              Thêm giao dịch
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <ArrowUpFromLine className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-amber-400">Khách nợ vỏ</p>
                  <p className="text-2xl font-black text-white">{totalOwedByCustomers.toLocaleString('vi-VN')}đ</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <ArrowDownToLine className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-cyan-400">Nhà máy nợ khách</p>
                  <p className="text-2xl font-black text-white">{Math.abs(totalOwedToCustomers).toLocaleString('vi-VN')}đ</p>
                </div>
              </div>
            </div>
          </div>

          {/* Deposits Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 font-medium">Không thể tải dữ liệu</p>
              <p className="text-slate-400 text-sm mt-1">Vui lòng thử lại sau</p>
            </div>
          ) : deposits.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-emerald-400 font-medium">Chưa có giao dịch vỏ bao</p>
              <p className="text-slate-400 text-sm mt-1">Bắt đầu bằng cách thêm giao dịch đầu tiên</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-400">Khách hàng</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-400">Vỏ trả ra</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-400">Vỏ thu về</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-400">Đơn giá</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-400">Còn nợ</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr key={deposit.customerId} className="border-b border-white/5 last:border-0">
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{deposit.customerName}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-amber-400 font-medium">
                        {deposit.shellsOut > 0 ? deposit.shellsOut : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-cyan-400 font-medium">
                        {deposit.shellsIn > 0 ? deposit.shellsIn : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400">
                        {deposit.depositPerShell.toLocaleString('vi-VN')}đ
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${
                        deposit.netDepositOwed > 0 ? 'text-amber-400' : deposit.netDepositOwed < 0 ? 'text-cyan-400' : 'text-slate-400'
                      }`}>
                        {Math.abs(deposit.netDepositOwed).toLocaleString('vi-VN')}đ
                        {deposit.netDepositOwed > 0 ? ' (nợ)' : deposit.netDepositOwed < 0 ? ' (thừa)' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-1">Thêm giao dịch vỏ bao</h3>
            <p className="text-slate-400 text-sm mb-6">Ghi nhận vỏ bao trả ra hoặc thu về</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Khách hàng</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="" className="bg-slate-900">Chọn khách hàng...</option>
                  {allCustomers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  <span className="flex items-center gap-1 text-amber-400">
                    <ArrowUpFromLine className="h-4 w-4" />
                    Vỏ trả ra (khách nợ nhà máy)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={shellsOut}
                  onChange={(e) => setShellsOut(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg focus:outline-none focus:border-amber-500/50"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  <span className="flex items-center gap-1 text-cyan-400">
                    <ArrowDownToLine className="h-4 w-4" />
                    Vỏ thu về (nhà máy nợ khách)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={shellsIn}
                  onChange={(e) => setShellsIn(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg focus:outline-none focus:border-cyan-500/50"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 border border-white/20 text-slate-400 font-semibold rounded-xl hover:bg-white/5 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedCustomer}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 text-white font-semibold rounded-xl transition-colors"
              >
                {submitting ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}