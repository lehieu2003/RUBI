'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { useUIStore } from '@/stores/ui-store';
import { Menu } from 'lucide-react';
import { KeyboardShortcutsModal } from '@/components/common/keyboard-shortcuts-modal';
import { OfflineBanner } from '@/components/common/offline-banner';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isSidebarCollapsed, openMobileSidebar } = useUIStore();

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d]">
      <OfflineBanner />
      <Sidebar />

      {/* Top Mobile Bar for screens < 1024px */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#c2c6d3] bg-white px-4 text-[#111c2d] lg:hidden shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={openMobileSidebar}
            aria-label="Mở menu"
            className="flex h-9 w-9 items-center justify-center rounded border border-[#c2c6d3] text-[#424751] hover:bg-[#f0f3ff]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-sm text-[#002754]">IceFlow SaaS</span>
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

      {/* Global Keyboard Shortcuts Dialog (Triggered with ? or F1) */}
      <KeyboardShortcutsModal />
    </div>
  );
}
