'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
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
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
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
  '/schedule': { icon: Calendar, label: 'Lịch trình' },
  '/dashboard/map': { icon: Truck, label: 'Bản đồ' },
  '/settings': { icon: Settings, label: 'Cài đặt' },
  '/config/prices': { icon: Package, label: 'Bảng giá' },
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

  const role = user?.role as TenantRole | undefined;

  // Operational menu items (excluding settings and billing)
  const operationalMenuItems = getVisibleTenantRoutes(role)
    .map((route) => ({
      href: route.href,
      ...(menuMetadata[route.href as keyof typeof menuMetadata] ?? {
        icon: FileText,
        label: route.label,
      }),
    }))
    .filter(
      (item) =>
        item.href !== '/settings/billing' &&
        item.href !== '/billing' &&
        item.href !== '/config/prices' &&
        item.href !== '/settings',
    );

  const hasSettingsAccess = getVisibleTenantRoutes(role).some((r) => r.href === '/settings');

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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-30 flex h-full flex-col border-r border-[#c2c6d3] bg-white text-[#111c2d] transition-all duration-300 shadow-xs ${
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
                  Quản Lý Xưởng Đá
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

        {/* Main Operational Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
          {operationalMenuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => router.prefetch(item.href)}
                className={`group flex items-center gap-3 rounded px-3 py-2 transition-all text-xs font-bold ${
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
                {!isSidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
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

        {/* Bottom Section: Settings, User Profile & Logout */}
        <div className="border-t border-[#e7eeff] bg-[#f9f9ff] px-3 py-3 space-y-2">
          {/* Settings Link */}
          {hasSettingsAccess && (
            <Link
              href="/settings"
              prefetch={true}
              className={`group flex items-center gap-3 rounded px-3 py-2 text-xs font-bold transition-all ${
                pathname.startsWith('/settings')
                  ? 'bg-[#004a99] text-white shadow-2xs'
                  : 'text-[#424751] hover:bg-[#dee8ff] hover:text-[#004a99]'
              } ${isSidebarCollapsed ? 'lg:justify-center' : ''}`}
              title="Cài đặt hệ thống"
            >
              <Settings className={`h-4 w-4 shrink-0 ${pathname.startsWith('/settings') ? 'text-white' : 'text-[#737783] group-hover:text-[#004a99]'}`} />
              {!isSidebarCollapsed && <span>Cài đặt</span>}
            </Link>
          )}

          {/* User Profile & Logout Row */}
          <div className={`pt-2 border-t border-[#e7eeff] flex items-center justify-between gap-2 px-1 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
            <div className={`flex items-center gap-2.5 min-w-0 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#dee8ff] text-[#004a99] text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#111c2d] leading-tight">
                    {user?.name || 'User'}
                  </p>
                  <p className="truncate text-[10px] text-[#737783] font-mono mt-0.5">
                    {user?.role === 'ADMIN' ? 'Quản lý' : user?.role === 'ACCOUNTANT' ? 'Kế toán' : user?.role === 'DRIVER' ? 'Tài xế' : 'Nhân viên'}
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
    </>
  );
}
