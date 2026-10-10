'use client';

import { useState } from 'react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { PASSWORD_HINT, validatePassword } from '@/lib/password';

const inputClass =
  'w-full px-3 py-2.5 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99]';
const labelClass = 'block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1';

export function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const policyError = validatePassword(newPassword);
    if (policyError) return setError(policyError);
    if (newPassword !== confirmPassword) return setError('Mật khẩu nhập lại không khớp');

    setSaving(true);
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? 'Không thể đổi mật khẩu');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ type: 'success', title: 'Đã đổi mật khẩu' });
      onSuccess?.();
    } catch {
      setError('Không thể kết nối đến máy chủ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && (
        <div className="p-3 bg-error-container border border-[#ba1a1a]/30 rounded text-xs font-bold text-on-error-container">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="current-password" className={labelClass}>Mật khẩu hiện tại</label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="new-password" className={labelClass}>Mật khẩu mới</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={PASSWORD_HINT}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className={labelClass}>Nhập lại mật khẩu mới</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors shadow-sm disabled:opacity-50"
      >
        {saving ? 'ĐANG LƯU...' : 'CẬP NHẬT MẬT KHẨU'}
      </button>
    </form>
  );
}
