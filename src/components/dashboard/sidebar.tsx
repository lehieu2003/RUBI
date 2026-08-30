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
} from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import {
  getVisibleTenantRoutes,
  type TenantRole,
} from '@/lib/rbac/permissions';
import { useUIStore } from '@/stores/ui-store';
import { X } from 'lucide-react';

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
  const menuItems = getVisibleTenantRoutes(role)
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
        item.href !== '/config/prices',
    );

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
          className='fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity'
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-[#c2c6d3] bg-[#00346f] text-white transition-all duration-300 ${
          isMobileSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        } ${isSidebarCollapsed ? 'lg:w-20' : 'w-64 lg:w-64'}`}
      >
        {/* Logo */}
        <div className='flex items-center justify-between border-b border-[#004a99] px-5 py-4 bg-[#002754]'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#004a99] text-white shadow-sm'>
              <Snowflake className='h-6 w-6 text-[#9bbdff]' />
            </div>
            {!isSidebarCollapsed && (
              <div className='flex flex-col'>
                <span className='text-xl font-bold tracking-tight text-white font-sans'>
                  IceFlow
                </span>
                <span className='text-[11px] uppercase tracking-wider text-[#9bbdff] font-semibold'>
                  Xưởng Sản Xuất
                </span>
              </div>
            )}
          </div>
          {/* Close button on mobile */}
          <button
            onClick={closeMobileSidebar}
            className='flex h-8 w-8 items-center justify-center rounded text-[#9bbdff] hover:bg-[#004a99] hover:text-white lg:hidden'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Navigation */}
        <nav className='flex-1 space-y-1.5 px-3 py-4 overflow-y-auto'>
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === '/settings' && pathname.startsWith('/settings/'));
            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch={true}
                onMouseEnter={() => router.prefetch(item.href)}
                className={`group flex items-center gap-3 rounded px-3 py-2.5 transition-all text-sm font-medium ${
                  isActive
                    ? 'bg-[#004a99] text-white shadow-sm'
                    : 'text-[#d7e2ff] hover:bg-[#002754] hover:text-white'
                }`}
              >
                <item.icon
                  className={`h-5 w-5 shrink-0 transition-transform ${
                    isActive
                      ? 'text-[#9bbdff]'
                      : 'text-[#abc7ff] group-hover:scale-105'
                  }`}
                />
                {!isSidebarCollapsed && (
                  <span className='truncate'>{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (hidden on mobile) */}
        <button
          onClick={toggleSidebarCollapse}
          className='hidden lg:flex items-center justify-center border-t border-[#004a99] py-3 text-[#abc7ff] hover:bg-[#002754] hover:text-white transition-colors'
        >
          {isSidebarCollapsed ? (
            <ChevronRight className='h-5 w-5' />
          ) : (
            <ChevronLeft className='h-5 w-5' />
          )}
        </button>

        {/* User & Logout */}
        <div className='border-t border-[#004a99] bg-[#002754] px-3 py-4'>
          <div
            className={`flex items-center gap-3 rounded px-2 py-2 ${
              isSidebarCollapsed ? 'lg:justify-center' : ''
            }`}
          >
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#255dad] text-white text-sm font-bold'>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!isSidebarCollapsed && (
              <div className='flex-1 overflow-hidden'>
                <p className='truncate text-sm font-semibold text-white'>
                  {user?.name || 'User'}
                </p>
                <p className='truncate text-xs text-[#9bbdff] font-mono'>
                  {user?.email}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className={`mt-2 flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium text-[#ffa878] transition-colors hover:bg-[#7f3700]/30 hover:text-[#ffdbca] ${
              isSidebarCollapsed ? 'lg:justify-center' : ''
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <LogOut className='h-4 w-4 shrink-0' />
            {!isSidebarCollapsed && (
              <span>{signingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
