'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { toast } from '@/components/dashboard/toast';

export default function RegisterPage() {
  const { user, signUp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const target = user.role === 'SUPER_ADMIN' ? '/admin/dashboard' : user.role === 'DRIVER' ? '/driver' : '/dashboard';
      router.replace(target);
    }
  }, [user, router]);
  const [factoryName, setFactoryName] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      const message = 'Mật khẩu phải có ít nhất 8 ký tự';
      setError(message);
      toast({ type: 'error', title: 'Đăng ký thất bại', message });
      return;
    }

    if (phone.length < 9 || phone.length > 15) {
      const message = 'Số điện thoại không hợp lệ';
      setError(message);
      toast({ type: 'error', title: 'Đăng ký thất bại', message });
      return;
    }

    setLoading(true);
    // signUp refreshes the auth-provider session (checkAuth) before
    // resolving, so the dashboard renders with the real identity.
    const result = await signUp(email, password, name, factoryName, phone);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push('/dashboard');
  };

  // Explicit Enter handling: some embedded browsers never fire the implicit
  // form submission on Enter.
  const handleEnterKey = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && !loading) {
      e.currentTarget.requestSubmit();
    }
  };

  return (
    <div className="relative bg-card shadow-sm border border-outline-variant rounded-2xl p-8 shadow-2xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-on-surface mb-2">Tạo tài khoản</h1>
        <p className="text-sm text-faint">Bắt đầu dùng thử miễn phí 14 ngày</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-error flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} onKeyDown={handleEnterKey} className="space-y-5">
        <div>
          <label htmlFor="factoryName" className="block text-sm font-medium text-on-surface-variant mb-2">
            Tên nhà máy / Doanh nghiệp
          </label>
          <input
            id="factoryName"
            type="text"
            value={factoryName}
            onChange={(e) => setFactoryName(e.target.value)}
            placeholder="Nhà máy đá ABC"
            required
            minLength={2}
            maxLength={100}
            className="w-full px-4 py-3 bg-card/5 border border-outline-variant rounded-xl text-on-surface placeholder-faint focus:outline-none focus:border-primary-accent/50 focus:bg-card transition-all text-sm"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-on-surface-variant mb-2">
            Số điện thoại liên hệ
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xxxxxxxx"
            required
            minLength={9}
            maxLength={15}
            className="w-full px-4 py-3 bg-card/5 border border-outline-variant rounded-xl text-on-surface placeholder-faint focus:outline-none focus:border-primary-accent/50 focus:bg-card transition-all text-sm"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-on-surface-variant mb-2">
            Tên người quản lý
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nguyễn Văn A"
            required
            className="w-full px-4 py-3 bg-card/5 border border-outline-variant rounded-xl text-on-surface placeholder-faint focus:outline-none focus:border-primary-accent/50 focus:bg-card transition-all text-sm"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-on-surface-variant mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@abcice.vn"
            required
            className="w-full px-4 py-3 bg-card/5 border border-outline-variant rounded-xl text-on-surface placeholder-faint focus:outline-none focus:border-primary-accent/50 focus:bg-card transition-all text-sm"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-on-surface-variant mb-2">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ít nhất 8 ký tự"
            required
            minLength={8}
            className="w-full px-4 py-3 bg-card/5 border border-outline-variant rounded-xl text-on-surface placeholder-faint focus:outline-none focus:border-primary-accent/50 focus:bg-card transition-all text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-primary-container hover:bg-primary text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Đang tạo tài khoản...
            </span>
          ) : 'Tạo tài khoản'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-faint">
        Đã có tài khoản?{' '}
        <Link href="/login" className="text-primary-accent hover:text-blue-300 font-medium transition-colors">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
