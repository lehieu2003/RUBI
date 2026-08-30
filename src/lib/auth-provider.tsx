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
      const data = await res.json();
      setUser(data.user);
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        const errorMsg = data.error || (data.errors ? 'Dữ liệu không hợp lệ' : 'Đăng nhập không thành công');
        toast({ type: 'error', title: 'Đăng nhập thất bại', message: errorMsg });
        return { error: errorMsg };
      }
      await checkAuth();
      toast({ type: 'success', title: 'Đăng nhập thành công' });
      return { error: null };
    } catch {
      const errorMsg = 'Có lỗi xảy ra khi kết nối máy chủ';
      toast({ type: 'error', title: 'Lỗi mạng', message: errorMsg });
      return { error: errorMsg };
    }
  };

  const signUp = async (email: string, password: string, name: string, factoryName?: string, phone?: string) => {
    try {
      const res = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, factoryName, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        const errorMsg = data.error || (data.errors ? 'Dữ liệu không hợp lệ' : 'Đăng ký không thành công');
        toast({ type: 'error', title: 'Đăng ký thất bại', message: errorMsg });
        return { error: errorMsg };
      }
      await checkAuth();
      toast({ type: 'success', title: 'Đăng ký thành công', message: 'Chào mừng bạn đến với IceFlow!' });
      return { error: null };
    } catch {
      const errorMsg = 'Có lỗi xảy ra khi kết nối máy chủ';
      toast({ type: 'error', title: 'Lỗi mạng', message: errorMsg });
      return { error: errorMsg };
    }
  };

  const signOut = async () => {
    try {
      await fetch(API_ENDPOINTS.AUTH.LOGOUT, { method: 'POST' });
      setUser(null);
      toast({ type: 'info', title: 'Đã đăng xuất' });
    } catch {
      // Ignore logout error
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
