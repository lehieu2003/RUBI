'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { canAccessPath, isTenantAppPath } from '@/lib/rbac/permissions';

interface User {
  id: string;
  email: string;
  name: string;
  role?: 'ADMIN' | 'STAFF' | 'DRIVER';
  factoryId?: string;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.ME);
      const json = await res.json();
      const payload = json?.data !== undefined ? json.data : json;
      setUser(payload?.user ?? null);
      // A manager reset can flag a session that is already open: the token
      // still passes the middleware, so send the user on from here.
      if (payload?.user?.mustChangePassword && window.location.pathname !== '/change-password') {
        window.location.href = '/change-password';
      }
      // The manager changed this person's role while they were signed in: the
      // page they are on belongs to the old role. "/" sends them to the home
      // of the new one (the cookie was just replaced by /api/auth/me).
      const path = window.location.pathname;
      if (payload?.user && isTenantAppPath(path) && !canAccessPath(payload.user.role, path)) {
        window.location.href = '/';
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      const payload = json?.data !== undefined ? json.data : json;
      if (!res.ok || json?.error || payload?.error) {
        const errorMsg = json?.error || payload?.error || (json?.errors ? 'Dữ liệu không hợp lệ' : 'Đăng nhập không thành công');
        toast({ type: 'error', title: 'Đăng nhập thất bại', message: errorMsg });
        return { error: errorMsg };
      }
      await checkAuth();
      toast({ type: 'success', title: 'Đăng nhập thành công' });
      return { error: null };
    } catch {
      toast({ type: 'error', title: 'Lỗi mạng', message: 'Không thể kết nối đến máy chủ' });
      return { error: 'Không thể kết nối đến máy chủ' };
    }
  };

  const signOut = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.LOGOUT, { method: 'POST' });
      if (!res.ok) {
        toast({
          type: 'error',
          title: 'Không thể đăng xuất',
          message: 'Vui lòng thử lại hoặc tắt trình duyệt để kết thúc phiên.',
        });
        return;
      }
      setUser(null);
      toast({ type: 'info', title: 'Đã đăng xuất' });
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
