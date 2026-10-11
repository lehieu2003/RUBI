'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Moon,
  Users,
  Snowflake,
  Truck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Receipt,
  BarChart3,
  Package,
  Calendar,
  Sun,
  Wrench,
  History,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { useTheme } from '@/lib/theme';
import {
  getVisibleTenantRoutes,
  type TenantRole,
} from '@/lib/rbac/permissions';
import { useUIStore } from '@/stores/ui-store';

const menuMetadata = {
  '/dashboard': { icon: LayoutDashboard, label: 'Tổng quan' },
  '/orders': { icon: FileText, label: 'Đơn hàng' },
  '/customers': { icon: Users, label: 'Khách hàng' },
  '/settle': { icon: Receipt, label: 'Đối soát' },
  '/reports/debt': { icon: BarChart3, label: 'Báo cáo nợ' },
  '/deposits/shells': { icon: Package, label: 'Vỏ bao' },
  '/inventory': { icon: Snowflake, label: 'Kho lạnh' },
  '/vehicles': { icon: Truck, label: 'Đội xe' },
  '/assets': { icon: Wrench, label: 'Tài sản' },
  '/schedule': { icon: Calendar, label: 'Lịch trình' },
  '/my-schedule': { icon: Calendar, label: 'Ca làm của tôi' },
  '/reports/shifts': { icon: BarChart3, label: 'Bảng công' },
  '/audit-log': { icon: History, label: 'Nhật ký' },
  '/settings': { icon: Settings, label: 'Cài đặt' },
  '/config/prices': { icon: Package, label: 'Sản phẩm & giá' },
};

export function Sidebar() {
  const {
    isSidebarCollapsed,
    toggleSidebarCollapse,
    isMobileSidebarOpen,
    closeMobileSidebar,
  } = useUIStore();
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { resolved, toggle: toggleTheme } = useTheme();

  const role = user?.role as TenantRole | undefined;

  // Operational menu items (Cài đặt stays in the menu, role-gated by the
  // route permission table)
  const operationalMenuItems = getVisibleTenantRoutes(role)
    .map((route) => ({
      href: route.href,
      ...(menuMetadata[route.href as keyof typeof menuMetadata] ?? {
        icon: FileText,
        label: route.label,
      }),
    }));

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-30 flex h-full flex-col border-r border-outline-variant bg-card text-on-surface transition-all duration-300 shadow-xs ${
          isMobileSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        } ${isSidebarCollapsed ? 'lg:w-20' : 'w-64 lg:w-64'}`}
      >
        {/* Logo Header */}
        <div className="flex items-center justify-between border-b border-outline-soft px-5 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#004a99] text-white shadow-2xs">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-primary-dark font-sans">
                  Rubi
                </span>
                <span className="text-[10px] uppercase tracking-wider text-primary-accent font-bold">
                  Nhà máy đá tinh khiết
                </span>
              </div>
            )}
          </div>
          {/* Close button on mobile */}
          <button
            onClick={closeMobileSidebar}
            className="flex h-8 w-8 items-center justify-center rounded text-faint hover:bg-container-low hover:text-on-surface lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Operational Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
          {operationalMenuItems.map((item) => {
            const isActive =
              item.href === '/settings'
                ? pathname.startsWith('/settings')
                : pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch={true}
                onClick={closeMobileSidebar}
                onMouseEnter={() => router.prefetch(item.href)}
                className={`group flex items-center gap-3 rounded px-3 py-2 transition-all text-xs font-bold ${
                  isActive
                    ? 'bg-[#004a99] text-white shadow-2xs'
                    : 'text-on-surface-variant hover:bg-container-low hover:text-primary-accent'
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    isActive
                      ? 'text-white'
                      : 'text-faint group-hover:text-primary-accent group-hover:scale-105'
                  }`}
                />
                {!isSidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle + Theme toggle (hidden on mobile) */}
        <div className="hidden lg:flex border-t border-outline-soft">
          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center border-r border-outline-soft py-2.5 text-faint hover:bg-container-low hover:text-primary-accent transition-colors"
            title={resolved === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
            aria-label={resolved === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleSidebarCollapse}
            className="flex-1 flex items-center justify-center py-2.5 text-faint hover:bg-container-low hover:text-primary-accent transition-colors"
            title={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Bottom Section: User Profile & Logout */}
        <div className="border-t border-outline-soft bg-surface px-3 py-3 space-y-2">
          {/* User Profile & Logout Row */}
          <div className={`pt-2 border-t border-outline-soft flex items-center justify-between gap-2 px-1 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
            <div className={`flex items-center gap-2.5 min-w-0 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-container-high text-primary-accent text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-on-surface leading-tight">
                    {user?.name || 'User'}
                  </p>
                  <p className="truncate text-[10px] text-faint font-mono mt-0.5">
                    {user?.role === 'ADMIN' ? 'Quản lý' : user?.role === 'DRIVER' ? 'Tài xế' : 'Nhân viên'}
                  </p>
                  <Link href="/change-password" className="text-[10px] text-primary-accent hover:underline">
                    Đổi mật khẩu
                  </Link>
                </div>
              )}
            </div>

            {/* Logout Action Button */}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              title="Đăng xuất"
              className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-bold text-error hover:bg-error-container transition-colors disabled:opacity-50 ${
                isSidebarCollapsed ? 'w-full justify-center' : ''
              }`}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!isSidebarCollapsed && <span>{signingOut ? '...' : 'Thoát'}</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
