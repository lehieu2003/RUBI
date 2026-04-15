'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [total, setTotal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Compute total from values and prices
  useEffect(() => {
    let sum = 0;
    values.forEach((qty, productId) => {
      const price = prices[productId] ?? 0;
      sum += qty * price;
    });
    setTotal(sum);
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
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + New Order
      </button>

      <Drawer isOpen={isOpen} onClose={closeDrawer} title="New Order">
        <div className="flex flex-col gap-4">
          {/* Customer search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
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
            <div className="rounded-md bg-blue-50 p-3 text-sm">
              <div className="font-medium text-blue-900">{customer.name}</div>
              <div className="text-blue-700">
                {customer.code} • {customer.phone}
              </div>
            </div>
          )}

          {/* Order matrix - only show when customer selected */}
          {customer && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
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
              <div className="flex items-center justify-between rounded-md bg-gray-100 px-4 py-3">
                <span className="font-medium text-gray-700">Tổng cộng</span>
                <span className="text-xl font-bold text-gray-900">
                  {total.toLocaleString()}đ
                </span>
              </div>

              {/* Error message */}
              {saveError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {saveError}
                </div>
              )}

              {/* Save button */}
              <button
                onClick={handleConfirm}
                disabled={isSaving || values.size === 0}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
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