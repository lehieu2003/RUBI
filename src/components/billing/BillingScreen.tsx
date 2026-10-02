'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { SubscriptionStatusCard } from '@/components/dashboard/subscription-status-card';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { VietQRCode } from '@/components/billing/VietQRCode';
import { PricingDisplay } from '@/components/billing/PricingDisplay';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

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
  factoryName?: string | null;
}

interface Session {
  user: {
    role?: string;
  } | null;
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
    fetch(API_ENDPOINTS.AUTH.ME)
      .then(r => r.json())
      .then(sessionJson => {
        const sessionData: Session = sessionJson?.data !== undefined ? sessionJson.data : sessionJson;
        setSession(sessionData);
        const role = sessionData.user?.role;
        if (role && role !== 'ADMIN' && role !== 'ACCOUNTANT' && role !== 'SUPER_ADMIN') {
          router.push('/dashboard');
          return;
        }
        return fetch(API_ENDPOINTS.BILLING.SUBSCRIPTION)
          .then(r => r.json())
          .then(dJson => {
            const d = dJson?.data !== undefined ? dJson.data : dJson;
            setData(d);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-accent" />
        </div>
      </DashboardLayout>
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
      const response = await fetch(API_ENDPOINTS.PAYMENTS.CONFIRM, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          amount: transferAmount,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = result.error ?? 'Không thể nâng cấp gói. Vui lòng thử lại.';
        setPaymentError(message);
        toast({ type: 'error', title: 'Nâng cấp thất bại', message });
        return;
      }

      setData(current => current
        ? { ...current, subscription: result.subscription }
        : current);
      setPaymentMessage('Đã nâng cấp gói thành công. Thuê bao được gia hạn thêm 30 ngày.');
      toast({ type: 'success', title: 'Đã nâng cấp gói thành công' });
    } catch {
      const message = 'Không thể kết nối máy chủ. Vui lòng thử lại.';
      setPaymentError(message);
      toast({ type: 'error', title: 'Nâng cấp thất bại', message });
    } finally {
      setConfirmingPayment(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1000px]">
        <div className="mb-6 border-b border-outline-variant pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Thanh Toán & Thuê Bao</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Theo dõi trạng thái gói cước, số lượng tài xế và thông tin thanh toán cho nhà máy.
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SubscriptionStatusCard
              subscription={subscriptionForStatus}
              driverCount={driverCount}
              isAdmin={true}
            />
            <PricingDisplay driverCount={driverCount} pricePerDriver={pricePerDriver} />
          </div>

          {!subscription && (
            <div className="rounded border border-tertiary-container/30 bg-tertiary-fixed/40 p-4 text-xs font-bold text-tertiary-container">
              Chưa có hồ sơ thuê bao cho nhà máy này. Vui lòng liên hệ IceFlow để kích hoạt gói trước khi thanh toán.
            </div>
          )}

          <VietQRCode
            amount={transferAmount}
            factoryName={data?.factoryName ?? undefined}
            subscriptionId={subscription?.id}
          />

          {canSelfUpgrade && (
            <div className="rounded border border-outline-variant bg-card p-5 shadow-sm">
              <h2 className="text-base font-bold text-on-surface">Kích Hoạt Nâng Cấp Gói</h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                Sau khi chuyển khoản đúng số tiền và nội dung bên trên, nhấn nút xác nhận bên dưới để hệ thống kích hoạt gói trả phí và gia hạn thêm 30 ngày.
              </p>

              <button
                type="button"
                onClick={handleUpgrade}
                disabled={!subscription || confirmingPayment}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded bg-[#004a99] hover:bg-[#00346f] px-5 py-3 text-xs font-bold text-white transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirmingPayment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {confirmingPayment ? 'Đang kích hoạt...' : 'TÔI ĐÃ CHUYỂN KHOẢN — NÂNG CẤP GÓI'}
              </button>

              {paymentMessage && (
                <div className="mt-3 rounded border border-[#1b6d24]/30 bg-[#a0f399]/30 p-3 text-xs font-bold text-secondary">
                  {paymentMessage}
                </div>
              )}

              {paymentError && (
                <div className="mt-3 rounded border border-[#ba1a1a]/30 bg-error-container/60 p-3 text-xs font-bold text-on-error-container">
                  {paymentError}
                </div>
              )}
            </div>
          )}

          {!canSelfUpgrade && (
            <p className="text-xs text-faint">
              Chỉ tài khoản Quản lý (ADMIN) của nhà máy mới được thực hiện nâng cấp gói.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
