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
} from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { getVisibleTenantRoutes, type TenantRole } from '@/lib/rbac/permissions';

const menuMetadata = {
  '/dashboard': { icon: LayoutDashboard, label: 'Tổng quan' },
  '/orders': { icon: FileText, label: 'Đơn hàng' },
  '/customers': { icon: Users, label: 'Khách hàng' },
  '/settle': { icon: Receipt, label: 'Đối soát' },
  '/reports/debt': { icon: BarChart3, label: 'Báo cáo nợ' },
  '/deposits/shells': { icon: Package, label: 'Vỏ bao' },
  '/inventory': { icon: Snowflake, label: 'Kho lạnh' },
  '/vehicles': { icon: Truck, label: 'Đội xe' },
  '/dashboard/map': { icon: Truck, label: 'Bản đồ' },
  '/settings': { icon: Settings, label: 'Cài đặt' },
  '/config/prices': { icon: Package, label: 'Bảng giá' },
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
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
    .filter((item) => item.href !== '/settings/billing' && item.href !== '/billing' && item.href !== '/config/prices');

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-full flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/30">
          <Snowflake className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-xl font-black text-transparent">
            IceFlow
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/settings' && pathname.startsWith('/settings/'));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600/20 to-violet-600/20 text-white shadow-lg shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon
                className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
                  isActive ? 'text-blue-400' : 'group-hover:scale-110'
                }`}
              />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center border-t border-white/10 py-3 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-5 w-5" />
        ) : (
          <ChevronLeft className="h-5 w-5" />
        )}
      </button>

      {/* User & Logout */}
      <div className="border-t border-white/10 px-3 py-4">
        <div
          className={`flex items-center gap-3 rounded-xl px-3 py-3 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-white">
                {user?.name || 'User'}
              </p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 ${
            collapsed ? 'justify-center' : ''
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <span className="text-sm font-medium">
              {signingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
