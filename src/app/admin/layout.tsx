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
import { API_ENDPOINTS } from '@/lib/api-endpoints';

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
      const res = await fetch(API_ENDPOINTS.ADMIN.IMPERSONATE.END, { method: 'POST' });
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
      <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d]">
        <aside className="fixed left-0 top-0 z-30 flex h-full w-64 flex-col border-r border-[#c2c6d3] bg-[#002754] text-white">
          <div className="flex items-center gap-3 border-b border-[#00346f] px-5 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#004a99] shadow-sm">
              <Snowflake className="h-5 w-5 text-[#9bbdff]" />
            </div>
            <div>
              <p className="text-base font-bold text-white tracking-wide">IceFlow</p>
              <p className="text-xs font-bold text-[#9bbdff] uppercase tracking-wider">SUPER ADMIN</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded px-3 py-2.5 text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-[#004a99] text-white'
                      : 'text-[#d8e3fb] hover:bg-[#00346f] hover:text-white'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#9bbdff]'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="relative pl-64">
          <div className="p-8 max-w-[1400px]">{children}</div>
        </main>
      </div>
      <Suspense fallback={null}>
        <ImpersonationOverlay />
      </Suspense>
    </>
  );
}
