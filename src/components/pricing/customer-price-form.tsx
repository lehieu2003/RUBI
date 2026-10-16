'use client';

import { useState } from 'react';
import { Customer, Product } from '@prisma/client';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { groupProductsByName } from '@/lib/product-groups';

type PriceMap = Map<string, number>;

interface CustomerPriceFormProps {
  customer: Customer;
  products: Product[];
  globalPrices: PriceMap;
  overridePrices: PriceMap;
}

export function CustomerPriceForm({
  customer,
  products,
  globalPrices,
  overridePrices,
}: CustomerPriceFormProps) {
  // Build effective prices: override OR global
  const effectivePrices = new Map<string, number>();
  for (const product of products) {
    const globalPrice = globalPrices.get(product.id) ?? 0;
    effectivePrices.set(product.id, overridePrices.get(product.id) ?? globalPrice);
  }

  // Track editing state per product
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [localOverrides, setLocalOverrides] = useState<PriceMap>(overridePrices);

  const handleStartEdit = (productId: string, currentPrice: number) => {
    setEditingProductId(productId);
    setEditValue(currentPrice.toString());
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setEditValue('');
  };

  const handleSaveOverride = async (productId: string) => {
    const newPrice = parseFloat(editValue);
    if (isNaN(newPrice) || newPrice <= 0) {
      handleCancelEdit();
      return;
    }

    setSaving(productId);
    setEditingProductId(null);
    setEditValue('');

    // Optimistic update
    setLocalOverrides((prev) => {
      const next = new Map(prev);
      next.set(productId, newPrice);
      return next;
    });

    try {
      const response = await fetch(API_ENDPOINTS.PRICES.CUSTOMER_OVERRIDE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id, productId, price: newPrice }),
      });
      if (!response.ok) throw new Error('Không thể lưu giá');
      toast({ type: 'success', title: 'Đã lưu giá riêng' });
    } catch {
      // Revert on error
      setLocalOverrides(overridePrices);
      toast({ type: 'error', title: 'Lưu thất bại', message: 'Không thể lưu giá riêng' });
    } finally {
      setSaving(null);
    }
  };

  const handleRemoveOverride = async (productId: string) => {
    setRemoving(productId);

    // Optimistic update
    const previousOverrides = new Map(localOverrides);
    setLocalOverrides((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });

    try {
      const response = await fetch(
        `/api/prices/customer/override?customerId=${customer.id}&productId=${productId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Không thể xoá giá riêng');
      toast({ type: 'success', title: 'Đã xóa giá riêng' });
    } catch {
      // Revert on error
      setLocalOverrides(previousOverrides);
      toast({ type: 'error', title: 'Xóa thất bại', message: 'Không thể xóa giá riêng' });
    } finally {
      setRemoving(null);
    }
  };

  // Re-compute effective prices from local overrides
  const currentEffectivePrices = new Map<string, number>();
  for (const product of products) {
    const globalPrice = globalPrices.get(product.id) ?? 0;
    currentEffectivePrices.set(product.id, localOverrides.get(product.id) ?? globalPrice);
  }

  // One table per kind of ice, grouped like the order grid.
  const groups = groupProductsByName(products);

  return (
    <div className="space-y-6">
      {groups.map(({ name: label, products: rowProducts }) => (
        <div key={label}>
          <h3 className="text-sm font-medium text-faint mb-3">{label}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left py-2 font-medium">Sản phẩm</th>
                <th className="text-right py-2 font-medium">Giá cơ bản (VND)</th>
                <th className="text-right py-2 font-medium">Giá riêng (VND)</th>
                <th className="w-32"></th>
              </tr>
            </thead>
            <tbody>
              {rowProducts.map((product) => {
                const globalPrice = globalPrices.get(product.id) ?? 0;
                const effectivePrice = currentEffectivePrices.get(product.id) ?? globalPrice;
                const hasOverride = localOverrides.has(product.id);
                const isEditing = editingProductId === product.id;
                const isSavingNow = saving === product.id;
                const isRemovingNow = removing === product.id;

                return (
                  <tr key={product.id} className="border-b border-gray-100">
                    <td className="py-2">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-faint ml-1">{product.sizeKg}kg</span>
                    </td>
                    <td className="text-right py-2 text-on-surface-variant">
                      {globalPrice.toLocaleString('vi-VN')}
                    </td>
                    <td className="text-right py-2">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-28 text-right border border-outline-variant rounded px-2 py-1"
                          autoFocus
                          min="0"
                        />
                      ) : (
                        <span className={hasOverride ? 'text-primary-accent font-medium' : 'text-faint'}>
                          {effectivePrice.toLocaleString('vi-VN')}
                          {hasOverride && <span className="text-xs ml-1 text-faint">(riêng)</span>}
                          {!hasOverride && <span className="text-xs ml-1 text-faint">(cơ bản)</span>}
                        </span>
                      )}
                    </td>
                    <td className="text-right py-2">
                      {isEditing ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleSaveOverride(product.id)}
                            disabled={isSavingNow}
                            className="px-2 py-1 bg-primary-container text-white text-xs rounded hover:bg-primary disabled:opacity-50"
                          >
                            {isSavingNow ? '...' : 'Lưu'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-2 py-1 bg-gray-200 text-on-surface-variant text-xs rounded hover:bg-gray-300"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : hasOverride ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleStartEdit(product.id, effectivePrice)}
                            className="px-2 py-1 text-xs text-primary-accent hover:text-blue-800"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleRemoveOverride(product.id)}
                            disabled={isRemovingNow}
                            className="px-2 py-1 text-xs text-error hover:text-error disabled:opacity-50"
                          >
                            {isRemovingNow ? '...' : 'Xóa'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(product.id, globalPrice)}
                          className="px-2 py-1 text-xs text-primary-accent hover:text-blue-800"
                        >
                          Đặt giá riêng
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
