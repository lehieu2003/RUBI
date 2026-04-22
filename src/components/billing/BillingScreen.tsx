'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { SubscriptionStatusCard } from '@/components/dashboard/subscription-status-card';
import { Sidebar } from '@/components/dashboard/sidebar';
import { VietQRCode } from '@/components/billing/VietQRCode';
import { PricingDisplay } from '@/components/billing/PricingDisplay';

interface SubscriptionData {
  subscription: {
    id: string;
    planType: 'TRIAL' | 'PAID';
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
    endDate: string;
    driverCount: number;
    pricePerDriver: number | string | null;
  } | null;
  driverCount: number;
}

interface Session {
  user: {
    role?: string;
  } | null;
}

function BillingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <Sidebar />

      <main className="pl-64">
        <div className="relative p-8">{children}</div>
      </main>
    </div>
  );
}

export function BillingScreen() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then((sessionData: Session) => {
        setSession(sessionData);
        const role = sessionData.user?.role;
        if (role && role !== 'ADMIN' && role !== 'ACCOUNTANT' && role !== 'SUPER_ADMIN') {
          router.push('/dashboard');
          return;
        }
        return fetch('/api/billing/subscription')
          .then(r => r.json())
          .then(d => { setData(d); setLoading(false); })
          .catch(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <BillingLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-slate-400">Loading...</div>
        </div>
      </BillingLayout>
    );
  }

  const role = session?.user?.role;
  const canSelfUpgrade = role === 'ADMIN';

  if (session && role !== 'ADMIN' && role !== 'ACCOUNTANT' && role !== 'SUPER_ADMIN') {
    return null;
  }

  const subscription = data?.subscription ?? null;
  const driverCount = data?.driverCount ?? 0;
  const pricePerDriver = Number(subscription?.pricePerDriver ?? 150000);
  const transferAmount = Math.max(0, Math.max(0, driverCount - 1) * pricePerDriver);
  const subscriptionForStatus = subscription
    ? { ...subscription, pricePerDriver }
    : null;

  const handleUpgrade = async () => {
    if (!subscription || confirmingPayment) return;

    setConfirmingPayment(true);
    setPaymentMessage(null);
    setPaymentError(null);

    try {
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          amount: transferAmount,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPaymentError(result.error ?? 'Không thể nâng cấp gói. Vui lòng thử lại.');
        return;
      }

      setData(current => current
        ? { ...current, subscription: result.subscription }
        : current);
      setPaymentMessage('Đã nâng cấp gói thành công. Thuê bao được gia hạn thêm 30 ngày.');
    } catch {
      setPaymentError('Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  return (
    <BillingLayout>
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-400">Cài đặt</p>
        <h1 className="mt-1 text-3xl font-black text-white">Thanh toán</h1>
        <p className="mt-2 text-slate-400">
          Theo dõi thuê bao và thông tin chuyển khoản cho nhà máy.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <SubscriptionStatusCard
          subscription={subscriptionForStatus}
          driverCount={driverCount}
          isAdmin={true}
        />

        <PricingDisplay driverCount={driverCount} pricePerDriver={pricePerDriver} />

        {!subscription && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Chưa có hồ sơ thuê bao cho nhà máy này. Vui lòng liên hệ IceFlow để kích hoạt gói
            trước khi thanh toán.
          </div>
        )}

        <VietQRCode amount={transferAmount} />

        {canSelfUpgrade && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">Nâng cấp gói</h2>
            <p className="mt-2 text-sm text-slate-400">
              Sau khi chuyển khoản đúng nội dung bên trên, nhấn nút này để kích hoạt gói trả phí
              và gia hạn thuê bao thêm 30 ngày.
            </p>

            <button
              type="button"
              onClick={handleUpgrade}
              disabled={!subscription || confirmingPayment}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirmingPayment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {confirmingPayment ? 'Đang nâng cấp...' : 'Tôi đã chuyển khoản - nâng cấp gói'}
            </button>

            {paymentMessage && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {paymentMessage}
              </div>
            )}

            {paymentError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {paymentError}
              </div>
            )}
          </div>
        )}

        {!canSelfUpgrade && (
          <p className="text-sm text-slate-400">
            Chỉ tài khoản ADMIN của nhà máy mới được nâng cấp gói. Tài khoản kế toán chỉ xem thông
            tin thanh toán.
          </p>
        )}
      </div>
    </BillingLayout>
  );
}
