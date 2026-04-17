'use client';

import { TrialBanner } from '@/components/trial/TrialBanner';
import { Sidebar } from '@/components/dashboard/sidebar';
import { useAuth } from '@/lib/auth-provider';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, loading } = useAuth();

  // Show nothing for unauthenticated users (middleware handles redirect)
  if (!user && !loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <Sidebar />
      <div className="pl-64 transition-all duration-300">
        <TrialBanner />
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}