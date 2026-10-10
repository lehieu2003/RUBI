'use client';

import { KeyRound } from 'lucide-react';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { useAuth } from '@/lib/auth-provider';

export default function ChangePasswordPage() {
  const { user, signOut } = useAuth();

  // Full reload so the middleware and auth provider both see the new session.
  const goHome = () => {
    window.location.href = user?.role === 'DRIVER' ? '/driver' : '/dashboard';
  };

  return (
    <div className="relative rounded border border-outline-variant bg-card p-8 shadow-sm">
      <div className="text-center mb-6">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded bg-[#004a99] text-white">
          <KeyRound className="h-6 w-6 text-[#9bbdff]" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">Đổi mật khẩu</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          {user?.mustChangePassword
            ? 'Tài khoản của bạn đang dùng mật khẩu được cấp. Hãy đặt mật khẩu riêng để tiếp tục.'
            : 'Đặt mật khẩu mới cho tài khoản của bạn.'}
        </p>
      </div>

      <ChangePasswordForm onSuccess={goHome} />

      <div className="mt-6 flex items-center justify-between text-xs">
        {user?.mustChangePassword ? (
          <span />
        ) : (
          <button onClick={goHome} className="text-primary-accent hover:underline font-bold">
            Quay lại
          </button>
        )}
        <button onClick={() => void signOut()} className="text-on-surface-variant hover:underline">
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
