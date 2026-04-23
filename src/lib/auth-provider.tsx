'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { toast } from '@/components/dashboard/toast';

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
      const res = await fetch('/api/auth/me');
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ type: 'error', title: 'Đăng nhập thất bại', message: data.error });
        return { error: data.error };
      }
      await checkAuth();
      toast({ type: 'success', title: 'Đăng nhập thành công' });
      return { error: null };
    } catch {
      toast({ type: 'error', title: 'Đăng nhập thất bại', message: 'Lỗi kết nối' });
      return { error: 'Lỗi kết nối' };
    }
  };

  const signUp = async (email: string, password: string, name: string, factoryName?: string, phone?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, factoryName, phone }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ type: 'error', title: 'Đăng ký thất bại', message: data.error });
        return { error: data.error };
      }
      setUser(data.user);
      toast({ type: 'success', title: 'Đăng ký thành công' });
      return { error: null };
    } catch {
      toast({ type: 'error', title: 'Đăng ký thất bại', message: 'Lỗi kết nối' });
      return { error: 'Lỗi kết nối' };
    }
  };

  const signOut = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Không thể đăng xuất');
      setUser(null);
      toast({ type: 'success', title: 'Đã đăng xuất' });
    } catch {
      toast({ type: 'error', title: 'Đăng xuất thất bại', message: 'Vui lòng thử lại' });
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
