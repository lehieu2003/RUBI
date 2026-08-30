'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  Headphones,
  Snowflake,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Menu,
} from 'lucide-react';
import { ImpersonationDrawer } from '@/components/admin/impersonation-drawer';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { useAuth } from '@/lib/auth-provider';
import { useUIStore } from '@/stores/ui-store';

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
  const { user, signOut } = useAuth();
  const {
    isSidebarCollapsed,
    toggleSidebarCollapse,
    isMobileSidebarOpen,
    openMobileSidebar,
    closeMobileSidebar,
  } = useUIStore();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
  };

  return (
    <>
      <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d]">
        {/* Mobile Header Bar */}
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#c2c6d3] bg-white px-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#004a99] text-white">
              <Snowflake className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-[#002754] text-sm">IceFlow Super Admin</span>
          </div>
          <button
            onClick={openMobileSidebar}
            className="flex h-9 w-9 items-center justify-center rounded border border-[#c2c6d3] text-[#424751] hover:bg-[#f0f3ff]"
            aria-label="Mở menu quản trị"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Backdrop */}
        {isMobileSidebarOpen && (
          <div
            onClick={closeMobileSidebar}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-[#c2c6d3] bg-white text-[#111c2d] transition-all duration-300 shadow-xs ${
            isMobileSidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          } ${isSidebarCollapsed ? 'lg:w-20' : 'w-64 lg:w-64'}`}
        >
          {/* Logo Header */}
          <div className="flex items-center justify-between border-b border-[#e7eeff] px-5 py-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#004a99] text-white shadow-2xs">
                <Snowflake className="h-5 w-5 text-white" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tight text-[#002754] font-sans">
                    IceFlow
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[#004a99] font-bold">
                    Hệ Thống Super Admin
                  </span>
                </div>
              )}
            </div>
            {/* Close button on mobile */}
            <button
              onClick={closeMobileSidebar}
              className="flex h-8 w-8 items-center justify-center rounded text-[#737783] hover:bg-[#f0f3ff] hover:text-[#111c2d] lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded px-3 py-2 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#004a99] text-white shadow-2xs'
                      : 'text-[#424751] hover:bg-[#f0f3ff] hover:text-[#004a99]'
                  }`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <item.icon
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isActive
                        ? 'text-white'
                        : 'text-[#737783] group-hover:text-[#004a99] group-hover:scale-105'
                    }`}
                  />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Collapse toggle (hidden on mobile) */}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex items-center justify-center border-t border-[#e7eeff] py-2.5 text-[#737783] hover:bg-[#f0f3ff] hover:text-[#004a99] transition-colors"
            title={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* Bottom Section: User Profile & Logout */}
          <div className="border-t border-[#e7eeff] bg-[#f9f9ff] px-3 py-3">
            <div className={`flex items-center justify-between gap-2 px-1 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
              <div className={`flex items-center gap-2.5 min-w-0 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#dee8ff] text-[#004a99] text-xs font-bold">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#111c2d] leading-tight">
                      {user?.name || 'Super Admin'}
                    </p>
                    <p className="truncate text-[10px] text-[#737783] font-mono mt-0.5">
                      Hệ thống Super Admin
                    </p>
                  </div>
                )}
              </div>

              {/* Logout Action Button */}
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                title="Đăng xuất"
                className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-bold text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors disabled:opacity-50 ${
                  isSidebarCollapsed ? 'w-full justify-center' : ''
                }`}
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                {!isSidebarCollapsed && <span>{signingOut ? '...' : 'Thoát'}</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area synchronized with Sidebar width */}
        <main
          className={`transition-all duration-300 ${
            isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
          }`}
        >
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">{children}</div>
        </main>
      </div>

      <Suspense fallback={null}>
        <ImpersonationOverlay />
      </Suspense>
    </>
  );
}
