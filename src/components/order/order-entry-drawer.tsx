'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useOrderStore } from '@/stores/order-store';
import { Drawer } from '@/components/ui/drawer';
import { SearchBar } from '@/components/order/search-bar';
import { OrderMatrix } from '@/components/order/order-matrix';
import { saveOrder, loadCustomerPrices, loadSellableStock } from '@/lib/actions/orders';
import { useSubmissionKey } from '@/lib/submission-key';
import { toast } from '@/components/dashboard/toast';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import type { Customer, Product } from '@prisma/client';

interface OrderEntryDrawerProps {
  customers: Customer[];
  products: Product[];
}

export function OrderEntryDrawer({ customers, products }: OrderEntryDrawerProps) {
  const { isOpen, customer, recentCustomerIds, openDrawer, closeDrawer } = useOrderStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [stock, setStock] = useState<Record<string, number>>({});
  const [values, setValues] = useState<Map<string, number>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Whether the selected customer's prices are in: confirm waits for 'ready'.
  const [priceStatus, setPriceStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // Bumped on every pick and close, so a late answer for an older pick is dropped.
  const priceRequest = useRef(0);
  // One Idempotency-Key per order: confirming again after a lost answer
  // resends it, so the server does not take the order twice.
  const submission = useSubmissionKey();

  // Forget everything typed or loaded for the previous customer, at once.
  const resetEntry = useCallback(() => {
    priceRequest.current += 1;
    submission.done();
    setValues(new Map());
    setPrices({});
    setStock({});
    setSaveError(null);
    setPriceStatus('loading');
  }, [submission]);

  const handleClose = useCallback(() => {
    resetEntry();
    closeDrawer();
  }, [resetEntry, closeDrawer]);

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
      // Clear before the grid shows, so anything typed from here on is kept.
      resetEntry();
      const request = priceRequest.current;
      useOrderStore.getState().setCustomer(selectedCustomer, new Map());
      useOrderStore.getState().addToRecent(selectedCustomer.id);
      // Load this customer's prices and what is left to sell, together.
      // The stock figure is only a hint: failing to load it must not block the order.
      try {
        const [priceList, sellable] = await Promise.all([
          loadCustomerPrices(selectedCustomer.id),
          loadSellableStock().catch(() => ({})),
        ]);
        if (request !== priceRequest.current) return;
        setPrices(priceList);
        setStock(sellable);
        setPriceStatus('ready');
      } catch {
        if (request !== priceRequest.current) return;
        setPriceStatus('error');
      }
    },
    [resetEntry]
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
    // The total and the order must use this customer's prices.
    if (priceStatus !== 'ready') return;

    setIsSaving(true);
    setSaveError(null);

    // Prices are not sent: the server applies the customer's price list itself.
    const lineItems = Array.from(values.entries()).map(([productId, qty]) => ({
      productId,
      quantity: qty,
    }));

    if (lineItems.length === 0) {
      setIsSaving(false);
      setSaveError('Vui lòng nhập số lượng cho ít nhất 1 loại đá');
      return;
    }

    const input = { customerId: customer.id, lineItems };
    let result;
    try {
      result = await saveOrder(input, submission.key(JSON.stringify(input)));
    } catch {
      // No answer: the order may have been saved. Confirming again sends the
      // same key, so it is not taken twice.
      setIsSaving(false);
      setSaveError('Mất kết nối, chưa rõ đơn đã lưu chưa. Bấm xác nhận lại: đơn sẽ không bị tạo hai lần.');
      return;
    }

    setIsSaving(false);

    if (result.success) {
      toast({ type: 'success', title: `Đã lên đơn thành công cho ${customer.name}` });
      // Refresh lists so the new order shows up immediately (TanStack Query
      // cache + RSC pages like the dashboard)
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.refresh();
      // Reset and close
      useOrderStore.getState().clearOrder();
      handleClose();
    } else {
      setSaveError(result.error);
    }
  }, [customer, values, isSaving, priceStatus, submission, handleClose, queryClient, router]);

  return (
    <>
      <button
        onClick={openDrawer}
        className="w-full flex items-center justify-center gap-2 rounded bg-[#004a99] hover:bg-[#00346f] active:bg-[#002754] text-white font-bold text-sm min-h-[48px] px-4 shadow-sm transition-all"
      >
        <span className="text-lg leading-none">+</span>
        <span>LÊN ĐƠN NHANH</span>
      </button>

      <Drawer isOpen={isOpen} onClose={handleClose} title="Tạo Đơn Hàng Tốc Độ Cao">
        <div className="flex flex-col gap-5">
          {/* Customer search */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
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
            <div className="rounded border border-[#004a99]/30 bg-container-high/50 p-3.5">
              <div className="font-bold text-base text-primary-dark">{customer.name}</div>
              <div className="text-xs text-primary-accent font-mono mt-0.5 font-medium">
                Mã: {customer.code} • SĐT: {customer.phone}
              </div>
            </div>
          )}

          {/* Order matrix - only show when customer selected */}
          {customer && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Số lượng bao đá đặt
                </label>
                <OrderMatrix
                  products={products}
                  prices={prices}
                  stock={stock}
                  values={values}
                  onChange={handleQuantityChange}
                  onConfirm={handleConfirm}
                  disabled={isSaving}
                />
              </div>

              {/* Total display */}
              <div className="flex items-center justify-between rounded border border-outline-variant bg-surface px-4 py-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Tổng cộng</span>
                <span className="text-2xl font-bold font-mono text-primary-accent">
                  {total.toLocaleString('vi-VN')}đ
                </span>
              </div>

              {priceStatus === 'error' && (
                <div className="flex items-center gap-2 rounded border border-[#ba1a1a]/30 bg-error-container p-3 text-xs font-bold text-on-error-container">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Không tải được bảng giá của khách này. Chọn lại khách để thử lại.</span>
                </div>
              )}

              {/* Error display */}
              {saveError && (
                <div className="flex items-center gap-2 rounded border border-[#ba1a1a]/30 bg-error-container p-3 text-xs font-bold text-on-error-container">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={isSaving || total === 0 || priceStatus !== 'ready'}
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