'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOrderStore } from '@/stores/order-store';
import { Drawer } from '@/components/ui/drawer';
import { SearchBar } from '@/components/order/search-bar';
import { OrderMatrix } from '@/components/order/order-matrix';
import { saveOrder, loadCustomerPrices } from '@/lib/actions/orders';
import type { Customer, Product } from '@prisma/client';

interface OrderEntryDrawerProps {
  customers: Customer[];
  products: Product[];
}

export function OrderEntryDrawer({ customers, products }: OrderEntryDrawerProps) {
  const { isOpen, customer, recentCustomerIds, openDrawer, closeDrawer } = useOrderStore();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [values, setValues] = useState<Map<string, number>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Compute total from values and prices using useMemo
  const total = useMemo(() => {
    let sum = 0;
    values.forEach((qty, productId) => {
      const price = prices[productId] ?? 0;
      sum += qty * price;
    });
    return sum;
  }, [values, prices]);

  // Handle customer selection
  const handleCustomerSelect = useCallback(
    async (selectedCustomer: Customer) => {
      useOrderStore.getState().setCustomer(selectedCustomer, new Map());
      useOrderStore.getState().addToRecent(selectedCustomer.id);
      // Load prices for this customer via server action
      const priceList = await loadCustomerPrices(selectedCustomer.id);
      setPrices(priceList);
      setValues(new Map());
    },
    []
  );

  // Handle quantity change
  const handleQuantityChange = useCallback((productId: string, qty: number) => {
    setValues((prev) => {
      const next = new Map(prev);
      if (qty <= 0) {
        next.delete(productId);
      } else {
        next.set(productId, qty);
      }
      return next;
    });
  }, []);

  // Handle confirm (save order)
  const handleConfirm = useCallback(async () => {
    if (!customer) return;
    if (isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    const lineItems = Array.from(values.entries()).map(([productId, qty]) => ({
      productId,
      quantity: qty,
      unitPrice: prices[productId] ?? 0,
      lineTotal: qty * (prices[productId] ?? 0),
    }));

    const result = await saveOrder({ customerId: customer.id, lineItems });

    setIsSaving(false);

    if (result.success) {
      // Reset and close
      setValues(new Map());
      setPrices({});
      useOrderStore.getState().clearOrder();
      closeDrawer();
    } else {
      setSaveError(result.error);
    }
  }, [customer, values, prices, isSaving, closeDrawer]);

  return (
    <>
      <button
        onClick={openDrawer}
        className="w-full flex items-center justify-center gap-2 rounded bg-[#004a99] hover:bg-[#00346f] active:bg-[#002754] text-white font-bold text-sm min-h-[48px] px-4 shadow-sm transition-all"
      >
        <span className="text-lg leading-none">+</span>
        <span>LÊN ĐƠN NHANH</span>
        <span className="ml-auto rounded bg-[#00346f] px-1.5 py-0.5 text-[10px] font-mono text-[#9bbdff]">
          F2 / Ctrl+N
        </span>
      </button>

      <Drawer isOpen={isOpen} onClose={closeDrawer} title="Tạo Đơn Hàng Tốc Độ Cao">
        <div className="flex flex-col gap-4">

          {/* Customer search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Khách hàng
            </label>
            <SearchBar
              customers={customers}
              onSelect={handleCustomerSelect}
              recentCustomerIds={recentCustomerIds}
            />
          </div>

          {/* Selected customer display */}
          {customer && (
            <div className="rounded-md bg-blue-500/20 border border-blue-500/30 p-3 text-sm">
              <div className="font-medium text-blue-300">{customer.name}</div>
              <div className="text-blue-400/70">
                {customer.code} • {customer.phone}
              </div>
            </div>
          )}

          {/* Order matrix - only show when customer selected */}
          {customer && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Số lượng (kg)
                </label>
                <OrderMatrix
                  products={products}
                  prices={prices}
                  values={values}
                  onChange={handleQuantityChange}
                  onConfirm={handleConfirm}
                  disabled={isSaving}
                />
              </div>

              {/* Total */}
              <div className="flex items-center justify-between rounded-md bg-slate-800 px-4 py-3">
                <span className="font-medium text-slate-300">Tổng cộng</span>
                <span className="text-xl font-bold text-emerald-400">
                  {total.toLocaleString()}đ
                </span>
              </div>

              {/* Error message */}
              {saveError && (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  {saveError}
                </div>
              )}

              {/* Save button */}
              <button
                onClick={handleConfirm}
                disabled={isSaving || values.size === 0}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
              >
                {isSaving ? 'Đang lưu...' : 'Lưu đơn hàng'}
              </button>
            </>
          )}
        </div>
      </Drawer>
    </>
  );
}