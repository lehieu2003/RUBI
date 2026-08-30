'use client';

import { create } from 'zustand';

interface UIStore {
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  toggleSidebarCollapse: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  toggleSidebarCollapse: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed: boolean) =>
    set({ isSidebarCollapsed: collapsed }),
  openMobileSidebar: () => set({ isMobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),
}));
