'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { href: '/orders', icon: FileText, label: 'Đơn hàng' },
  { href: '/customers', icon: Users, label: 'Khách hàng' },
  { href: '/inventory', icon: Snowflake, label: 'Kho lạnh' },
  { href: '/vehicles', icon: Truck, label: 'Đội xe' },
  { href: '/settings', icon: Settings, label: 'Cài đặt' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

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
          const isActive = pathname === item.href;
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
          onClick={() => signOut()}
          className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}
