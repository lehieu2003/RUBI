'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { useUIStore } from '@/stores/ui-store';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isSidebarCollapsed, openMobileSidebar } = useUIStore();

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d]">
      <Sidebar />

      {/* Top Mobile Bar for screens < 1024px */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#c2c6d3] bg-[#002754] px-4 text-white lg:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={openMobileSidebar}
            aria-label="Mở menu"
            className="flex h-9 w-9 items-center justify-center rounded bg-[#004a99] text-white hover:bg-[#255dad]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-sm tracking-wide text-white">IceFlow SaaS</span>
        </div>
      </div>

      {/* Main Content Area synchronized with Sidebar width */}
      <main
        className={`transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
