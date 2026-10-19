'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { Pagination } from '@/components/ui/pagination';
import { CUSTOMER_ENDPOINTS } from '@/lib/api-endpoints/customers';
import type { PaginationMeta } from '@/lib/pagination';
import { useSubmissionKey } from '@/lib/submission-key';

export type DebtCustomer = { customerId: string; customerName: string; outstandingDebt: number };

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded border border-outline-variant bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-3">
          <h2 className="text-base font-bold text-on-surface">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-on-surface-variant hover:bg-container-high" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/** Records money received from a customer. */
export function RecordPaymentDialog({
  customer,
  onClose,
  onRecorded,
}: {
  customer: DebtCustomer;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submission = useSubmissionKey();

  // Digits only, shown with thousands separators: "1.250.000"
  const value = Number(amount.replace(/\D/g, '')) || 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (value <= 0) return setError('Vui lòng nhập số tiền');
    if (value > customer.outstandingDebt) return setError(`Số tiền thu vượt quá công nợ hiện tại (${money(customer.outstandingDebt)})`);

    setSaving(true);
    try {
      const body = JSON.stringify({ amount: value, notes: notes.trim() || undefined });
      const response = await fetch(CUSTOMER_ENDPOINTS.PAYMENTS(customer.customerId), {
        method: 'POST',
        // A retry of the same payment after a lost answer is recorded once.
        headers: { 'Content-Type': 'application/json', ...submission.headers(body) },
        body,
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setError(json?.error ?? 'Không thể ghi nhận thanh toán');
        return;
      }
      submission.done();
      toast({
        type: 'success',
        title: `Đã ghi nhận ${money(value)}`,
        message: `${customer.customerName} còn nợ ${money(json.data.outstandingDebt)}`,
      });
      onRecorded();
    } catch {
      setError('Không thể kết nối đến máy chủ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title="Ghi nhận thanh toán" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded border border-outline-soft bg-surface px-3 py-2 text-sm">
          <p className="font-bold text-on-surface">{customer.customerName}</p>
          <p className="text-xs text-on-surface-variant">
            Đang nợ: <span className="font-mono font-bold text-error">{money(customer.outstandingDebt)}</span>
          </p>
        </div>

        {error && (
          <div className="rounded border border-[#ba1a1a]/30 bg-error-container p-3 text-xs font-bold text-on-error-container">{error}</div>
        )}

        <div>
          <label htmlFor="payment-amount" className="mb-1 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Số tiền thu (VND)
          </label>
          <div className="flex gap-2">
            <input
              id="payment-amount"
              inputMode="numeric"
              autoFocus
              value={value ? value.toLocaleString('vi-VN') : ''}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className="w-full rounded border border-outline-variant bg-card px-3 py-2.5 text-right font-mono text-base font-bold text-on-surface focus:border-[#004a99] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setAmount(String(customer.outstandingDebt))}
              className="shrink-0 rounded border border-outline-variant bg-card px-3 text-xs font-bold text-primary-deep hover:bg-container-high"
            >
              Thu đủ
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="payment-notes" className="mb-1 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Ghi chú
          </label>
          <input
            id="payment-notes"
            value={notes}
            maxLength={300}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Ví dụ: tiền mặt, chuyển khoản ngày 10/10"
            className="w-full rounded border border-outline-variant bg-card px-3 py-2 text-sm text-on-surface focus:border-[#004a99] focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded border border-outline-variant bg-card px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-container-high">
            HUỶ
          </button>
          <button type="submit" disabled={saving} className="rounded bg-[#004a99] px-4 py-2 text-xs font-bold text-white hover:bg-[#00346f] disabled:opacity-50">
            {saving ? 'ĐANG LƯU...' : 'GHI NHẬN'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

type LedgerEntry = { id: string; type: 'DEBT' | 'PAYMENT'; amount: number; notes: string | null; createdAt: string };

/** A customer's debt and payment entries, newest first. */
export function LedgerDialog({ customer, onClose }: { customer: DebtCustomer; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${CUSTOMER_ENDPOINTS.LEDGER(customer.customerId)}?page=${page}&limit=10`);
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? 'Không thể tải lịch sử công nợ');
      setEntries(json.data);
      setMeta(json.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải lịch sử công nợ');
    } finally {
      setLoading(false);
    }
  }, [customer.customerId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Dialog title={`Lịch sử công nợ: ${customer.customerName}`} onClose={onClose}>
      {error ? (
        <p className="text-sm font-bold text-error">{error}</p>
      ) : loading && entries.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary-accent" />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">Chưa có phát sinh nào.</p>
      ) : (
        <>
          <ul className="divide-y divide-outline-soft">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-on-surface">
                    {entry.type === 'PAYMENT' ? 'Khách trả tiền' : 'Phát sinh nợ'}
                    <span className="ml-2 font-normal text-faint">{new Date(entry.createdAt).toLocaleString('vi-VN')}</span>
                  </p>
                  {entry.notes && <p className="truncate text-xs text-on-surface-variant">{entry.notes}</p>}
                </div>
                <span className={`shrink-0 font-mono text-sm font-bold ${entry.type === 'PAYMENT' ? 'text-secondary' : 'text-error'}`}>
                  {entry.type === 'PAYMENT' ? '−' : '+'}
                  {money(entry.amount)}
                </span>
              </li>
            ))}
          </ul>
          {meta && <Pagination meta={meta} onPageChange={setPage} itemLabel="phát sinh" disabled={loading} />}
        </>
      )}
    </Dialog>
  );
}
