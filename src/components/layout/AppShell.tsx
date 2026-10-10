'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { useAuth } from '@/lib/auth-provider';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, loading } = useAuth();

  if (!user && !loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Sidebar />
      <div className="pl-64 transition-all duration-300">
        <main className="p-8 max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
}