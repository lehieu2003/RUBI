'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubscriptionStatusCard } from '@/components/dashboard/subscription-status-card';
import { PaymentRecorder } from '@/components/billing/PaymentRecorder';
import { VietQRCode } from '@/components/billing/VietQRCode';

interface SubscriptionData {
  subscription: {
    id: string;
    planType: string;
    status: string;
    endDate: string;
    driverCount: number;
    pricePerDriver: number;
  } | null;
  driverCount: number;
}

interface Session {
  role?: string;
}

export default function BillingPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check session for role
    fetch('/api/auth/me')
      .then(r => r.json())
      .then((sessionData: Session) => {
        setSession(sessionData);
        // D-06: Redirect non-ADMIN users to dashboard
        if (sessionData.role && sessionData.role !== 'ADMIN' && sessionData.role !== 'SUPER_ADMIN') {
          router.push('/dashboard');
          return;
        }
        // Load subscription data
        return fetch('/api/billing/subscription')
          .then(r => r.json())
          .then(d => { setData(d); setLoading(false); })
          .catch(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // Double-check: if session loaded and user is not ADMIN/SUPER_ADMIN, don't render
  if (session && session.role !== 'ADMIN' && session.role !== 'SUPER_ADMIN') {
    return null;
  }

  const subscription = data?.subscription ?? null;
  const driverCount = data?.driverCount ?? 0;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Page header */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
        <h1 className="text-2xl font-black text-slate-50">Thanh toán</h1>
      </div>

      {/* Subscription status card */}
      <div className="max-w-2xl mx-auto px-4">
        <SubscriptionStatusCard
          subscription={subscription}
          driverCount={driverCount}
          isAdmin={true}
        />
      </div>

      {/* Payment recorder */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <PaymentRecorder
          subscription={subscription}
          driverCount={driverCount}
          onPaymentConfirmed={() => {
            // Refetch subscription data after payment recorded
            fetch('/api/billing/subscription')
              .then(r => r.json())
              .then(setData);
          }}
        />
      </div>

      {/* VietQR code */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <VietQRCode
          amount={Math.max(0, Math.max(0, driverCount - 1) * (subscription?.pricePerDriver ?? 150000))}
        />
      </div>
    </div>
  );
}