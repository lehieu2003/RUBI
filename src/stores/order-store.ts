'use client';

import { create } from 'zustand';
import type { Customer, Product } from '@prisma/client';

export type LineItemData = {
  quantity: number;
  unitPrice: number;
};

interface OrderStore {
  isOpen: boolean;
  customer: Customer | null;
  lineItems: Map<string, LineItemData>;
  total: number;
  recentCustomerIds: string[];

  openDrawer: () => void;
  closeDrawer: () => void;
  setCustomer: (customer: Customer, prices: Map<string, number>) => void;
  setLineItem: (productId: string, quantity: number) => void;
  removeLineItem: (productId: string) => void;
  clearOrder: () => void;
  addToRecent: (customerId: string) => void;
}

const RECENT_STORAGE_KEY = 'recentCustomers';
const MAX_RECENT = 10;

function loadRecentFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentToStorage(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore storage errors
  }
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  isOpen: false,
  customer: null,
  lineItems: new Map(),
  total: 0,
  recentCustomerIds: loadRecentFromStorage(),

  openDrawer: () => {
    set({
      isOpen: true,
      recentCustomerIds: loadRecentFromStorage(),
    });
  },

  closeDrawer: () => {
    set({ isOpen: false, customer: null, lineItems: new Map(), total: 0 });
  },

  setCustomer: (customer, prices) => {
    set({ customer });
  },

  setLineItem: (productId, quantity) => {
    set((state) => {
      const newLineItems = new Map(state.lineItems);
      if (quantity <= 0) {
        newLineItems.delete(productId);
      } else {
        // unitPrice is looked up from prices passed at setCustomer time
        // For now store 0 and let parent recalculate via onChange callback
        const existing = newLineItems.get(productId);
        newLineItems.set(productId, {
          quantity,
          unitPrice: existing?.unitPrice ?? 0,
        });
      }
      return { lineItems: newLineItems };
    });
  },

  removeLineItem: (productId) => {
    set((state) => {
      const newLineItems = new Map(state.lineItems);
      newLineItems.delete(productId);
      return { lineItems: newLineItems };
    });
  },

  clearOrder: () => {
    set({ customer: null, lineItems: new Map(), total: 0 });
  },

  addToRecent: (customerId) => {
    set((state) => {
      const filtered = state.recentCustomerIds.filter((id) => id !== customerId);
      const updated = [customerId, ...filtered].slice(0, MAX_RECENT);
      saveRecentToStorage(updated);
      return { recentCustomerIds: updated };
    });
  },
}));

// Selector helpers
export const selectIsOpen = (s: OrderStore) => s.isOpen;
export const selectCustomer = (s: OrderStore) => s.customer;
export const selectLineItems = (s: OrderStore) => s.lineItems;
export const selectTotal = (s: OrderStore) => s.total;
export const selectRecentCustomerIds = (s: OrderStore) => s.recentCustomerIds;