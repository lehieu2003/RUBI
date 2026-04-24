'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  Headphones,
  Snowflake,
} from 'lucide-react';
import { ImpersonationDrawer } from '@/components/admin/impersonation-drawer';
import { toast } from '@/components/dashboard/toast';

const navItems = [
  { href: '/admin/dashboard', label: 'Tổng quan', icon: BarChart3 },
  { href: '/admin/tenants', label: 'Nhà máy', icon: Building2 },
  { href: '/admin/payments', label: 'Thanh toán', icon: CreditCard },
  { href: '/admin/audit-logs', label: 'Audit log', icon: ClipboardList },
  { href: '/admin/support', label: 'Hỗ trợ', icon: Headphones },
];

function ImpersonationOverlay() {
  const searchParams = useSearchParams();
  const factoryName = searchParams.get('impersonating');
  const factoryId = searchParams.get('factoryId');
  const hasImpersonating = factoryName && factoryId;

  const handleEndImpersonation = async () => {
    try {
      const res = await fetch('/api/admin/impersonate/end', { method: 'POST' });
      if (!res.ok) throw new Error('Không thể kết thúc impersonate');
      toast({ type: 'success', title: 'Đã thoát impersonate' });
    } catch (err) {
      toast({
        type: 'error',
        title: 'Thao tác thất bại',
        message: err instanceof Error ? err.message : 'Không thể kết thúc impersonate',
      });
    }
  };

  if (!hasImpersonating) return null;

  return (
    <ImpersonationDrawer
      factoryId={factoryId}
      factoryName={factoryName}
      onClose={handleEndImpersonation}
    />
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        </div>

        <aside className="fixed left-0 top-0 z-30 flex h-full w-64 flex-col border-r border-white/10 bg-slate-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/30">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-black text-white">IceFlow</p>
              <p className="text-xs font-medium text-violet-300">Super Admin</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600/20 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="relative pl-64">
          <div className="p-8">{children}</div>
        </main>
      </div>
      <Suspense fallback={null}>
        <ImpersonationOverlay />
      </Suspense>
    </>
  );
}
