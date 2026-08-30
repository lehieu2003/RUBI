'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { TrialWarningModal } from '@/components/trial/TrialWarningModal';
import { isWithinWarningPeriod } from '@/lib/subscription-status';
import { Snowflake } from 'lucide-react';
import type { Subscription } from '@prisma/client';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

export default function LoginPage() {
  const { signIn, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTrialWarning, setShowTrialWarning] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    if (!user) return;

    async function checkSubscription() {
      try {
        const res = await fetch(API_ENDPOINTS.AUTH.ME);
        const data = await res.json();
        if (data.subscription && isWithinWarningPeriod({ endDate: new Date(data.subscription.endDate) } as Subscription)) {
          setSubscription({ ...data.subscription, endDate: new Date(data.subscription.endDate) } as Subscription);
          setShowTrialWarning(true);
        }
      } catch {
        // Ignore - trial warning is optional
      }
    }
    checkSubscription();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await signIn(email.trim(), password);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    // After successful login, fetch role and redirect
    try {
      const meRes = await fetch(API_ENDPOINTS.AUTH.ME);
      const meData = await meRes.json();
      if (meData.user?.role === 'SUPER_ADMIN') {
        router.push('/admin/dashboard');
      } else if (meData.user?.role === 'DRIVER') {
        router.push('/driver');
      } else {
        router.push('/dashboard');
      }
    } catch {
      router.push('/dashboard');
    }
  };

  return (
    <>
      {showTrialWarning && subscription && (
        <TrialWarningModal subscription={subscription} />
      )}
      <div className="relative rounded border border-[#c2c6d3] bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded bg-[#004a99] text-white">
            <Snowflake className="h-6 w-6 text-[#9bbdff]" />
          </div>
          <h1 className="text-2xl font-bold text-[#111c2d]">Đăng nhập hệ thống</h1>
          <p className="text-xs text-[#424751] mt-1">IceFlow SaaS — Quản lý lò đá tốc độ cao</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-[#ffdad6] border border-[#ba1a1a]/30 rounded text-xs font-bold text-[#93000a] flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-[#424751] mb-1.5">
              Email tài khoản
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@miendong.vn"
              required
              className="w-full px-3.5 py-3 rounded border border-[#c2c6d3] bg-white text-[#111c2d] placeholder-[#737783] focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99] text-sm font-medium"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-[#424751] mb-1.5">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-3 rounded border border-[#c2c6d3] bg-white text-[#111c2d] placeholder-[#737783] focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99] text-sm font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#004a99] hover:bg-[#00346f] active:bg-[#002754] text-white font-bold rounded text-sm transition-all duration-150 disabled:opacity-50 shadow-sm mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang xác thực...
              </span>
            ) : (
              'ĐĂNG NHẬP'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#424751]">
          Chưa có tài khoản xưởng?{' '}
          <Link href="/register" className="text-[#004a99] hover:underline font-bold">
            Đăng ký dùng thử 14 ngày
          </Link>
        </p>
      </div>
    </>
  );
}

