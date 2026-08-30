'use client';

import { useState, useCallback, useMemo } from 'react';
import { useOrderStore } from '@/stores/order-store';
import { Drawer } from '@/components/ui/drawer';
import { SearchBar } from '@/components/order/search-bar';
import { OrderMatrix } from '@/components/order/order-matrix';
import { saveOrder, loadCustomerPrices } from '@/lib/actions/orders';
import { toast } from '@/components/dashboard/toast';
import { Check, Loader2, AlertCircle } from 'lucide-react';
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

    if (lineItems.length === 0) {
      setIsSaving(false);
      setSaveError('Vui lòng nhập số lượng cho ít nhất 1 loại đá');
      return;
    }

    const result = await saveOrder({ customerId: customer.id, lineItems });

    setIsSaving(false);

    if (result.success) {
      toast({ type: 'success', title: `Đã lên đơn thành công cho ${customer.name}` });
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
          F2
        </span>
      </button>

      <Drawer isOpen={isOpen} onClose={closeDrawer} title="Tạo Đơn Hàng Tốc Độ Cao">
        <div className="flex flex-col gap-5">
          {/* Customer search */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#424751]">
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
            <div className="rounded border border-[#004a99]/30 bg-[#dee8ff]/50 p-3.5">
              <div className="font-bold text-base text-[#002754]">{customer.name}</div>
              <div className="text-xs text-[#004a99] font-mono mt-0.5 font-medium">
                Mã: {customer.code} • SĐT: {customer.phone}
              </div>
            </div>
          )}

          {/* Order matrix - only show when customer selected */}
          {customer && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#424751]">
                  Số lượng bao đá đặt
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

              {/* Total display */}
              <div className="flex items-center justify-between rounded border border-[#c2c6d3] bg-[#f9f9ff] px-4 py-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#424751]">Tổng cộng</span>
                <span className="text-2xl font-bold font-mono text-[#004a99]">
                  {total.toLocaleString('vi-VN')}đ
                </span>
              </div>

              {/* Error display */}
              {saveError && (
                <div className="flex items-center gap-2 rounded border border-[#ba1a1a]/30 bg-[#ffdad6] p-3 text-xs font-bold text-[#93000a]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={isSaving || total === 0}
                className="w-full flex items-center justify-center gap-2 rounded bg-[#004a99] hover:bg-[#00346f] active:bg-[#002754] text-white font-bold text-sm min-h-[50px] px-4 shadow-sm transition-all disabled:opacity-40"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang lưu đơn hàng...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 stroke-[2.5]" />
                    <span>XÁC NHẬN TẠO ĐƠN (ENTER)</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </Drawer>
    </>
  );
}