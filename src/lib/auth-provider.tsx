'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface SubscriptionInfo {
  id: string;
  planType: 'TRIAL' | 'PAID';
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  endDate: string;
  driverCount: number;
  daysRemaining: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role?: 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'DRIVER' | 'SUPER_ADMIN';
  factoryId?: string;
  subscription?: SubscriptionInfo | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, factoryName?: string, phone?: string) => Promise<{ error: string | null }>;
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

  const signUp = async (
    email: string,
    password: string,
    name: string,
    factoryName?: string,
    phone?: string
  ) => {
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, factoryName, phone }),
      });
      const json = await res.json().catch(() => ({}));
      const payload = json?.data !== undefined ? json.data : json;
      if (!res.ok || json?.error || payload?.error) {
        const errorMsg = json?.error || payload?.error || 'Đăng ký không thành công';
        toast({ type: 'error', title: 'Đăng ký thất bại', message: errorMsg });
        return { error: errorMsg };
      }
      await checkAuth();
      toast({ type: 'success', title: 'Đăng ký thành công' });
      return { error: null };
    } catch {
      toast({ type: 'error', title: 'Lỗi mạng', message: 'Không thể kết nối đến máy chủ' });
      return { error: 'Không thể kết nối đến máy chủ' };
    }
  };

  const signOut = async () => {
    try {
      await fetch(API_ENDPOINTS.AUTH.LOGOUT, { method: 'POST' });
      setUser(null);
      toast({ type: 'info', title: 'Đã đăng xuất' });
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
