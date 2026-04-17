'use client';

import { PricingDisplay } from '@/components/billing/PricingDisplay';
import { VietQRCode } from '@/components/billing/VietQRCode';
import { PaymentRecorder } from '@/components/billing/PaymentRecorder';
import { useEffect, useState } from 'react';
import type { Subscription } from '@prisma/client';

interface BillingData {
  subscription: Subscription | null;
  driverCount: number;
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then(r => r.json())
      .then((res: BillingData) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setError('Không thể tải thông tin thanh toán');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center">Đang tải...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;

  const subscription = data?.subscription ?? null;
  const driverCount = data?.driverCount ?? 0;
  const daysLeft =
    subscription?.planType === 'TRIAL' && subscription.endDate
      ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold">Thanh toán &amp; Đăng ký</h1>

      {/* Subscription Status Card */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-2">Tình trạng đăng ký</h2>
        <p>
          Gói hiện tại:{' '}
          <span className="font-medium">{subscription?.planType ?? 'N/A'}</span>
        </p>
        <p>
          Trạng thái:{' '}
          <span className="font-medium">{subscription?.status ?? 'N/A'}</span>
        </p>
        <p>
          Số driver đang hoạt động:{' '}
          <span className="font-medium">{driverCount}</span>
        </p>
        {daysLeft !== null && (
          <p className="text-yellow-600 mt-1">
            Còn {daysLeft} ngày dùng thử
          </p>
        )}
      </div>

      <PricingDisplay driverCount={driverCount} pricePerDriver={150000} />

      <VietQRCode amount={Math.max(0, driverCount - 1) * 150000} />

      {subscription && (
        <PaymentRecorder
          subscription={subscription}
          driverCount={driverCount}
          onPaymentConfirmed={() => {
            // Refresh data after payment confirmation
            fetch('/api/billing/subscription')
              .then(r => r.json())
              .then((res: BillingData) => setData(res))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
