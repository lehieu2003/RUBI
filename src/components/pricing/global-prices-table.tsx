'use client';

import { useState } from 'react';
import { Product } from '@prisma/client';
import { toast } from '@/components/dashboard/toast';

type GlobalPricesMap = Map<string, number>;

interface GlobalPricesTableProps {
  products: Product[];
  globalPrices: GlobalPricesMap;
}

export function GlobalPricesTable({ products, globalPrices }: GlobalPricesTableProps) {
  const [prices, setPrices] = useState<GlobalPricesMap>(globalPrices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState<string | null>(null);

  const handleStartEdit = (productId: string, currentPrice: number) => {
    setEditingId(productId);
    setEditValue(currentPrice.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSave = async (productId: string) => {
    const newPrice = parseFloat(editValue);
    if (isNaN(newPrice) || newPrice <= 0) {
      handleCancelEdit();
      return;
    }

    setSaving(productId);
    // Optimistic update
    setPrices((prev) => {
      const next = new Map(prev);
      next.set(productId, newPrice);
      return next;
    });
    setEditingId(null);
    setEditValue('');

    try {
      const response = await fetch('/api/prices/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, price: newPrice }),
      });
      if (!response.ok) throw new Error('Failed to save');
      toast({ type: 'success', title: 'Đã cập nhật giá cơ bản' });
    } catch {
      // Revert on error
      setPrices(globalPrices);
      toast({ type: 'error', title: 'Lưu thất bại', message: 'Không thể cập nhật giá cơ bản' });
    } finally {
      setSaving(null);
    }
  };

  // Group products by type (Đá Bi, Đá Viên)
  const daBi = products.filter((p) => p.name === 'Đá Bi');
  const daVien = products.filter((p) => p.name === 'Đá Viên');

  return (
    <div className="space-y-6">
      {[
        { label: 'Đá Bi (Ice Block)', products: daBi },
        { label: 'Đá Viên (Ice Cube)', products: daVien },
      ].map(({ label, products: rowProducts }) => (
        <div key={label}>
          <h3 className="text-sm font-medium text-gray-500 mb-3">{label}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium">Sản phẩm</th>
                <th className="text-right py-2 font-medium">Giá hiện tại (VND)</th>
                <th className="text-right py-2 font-medium">Giá mới (VND)</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rowProducts.map((product) => {
                const currentPrice = prices.get(product.id) ?? 0;
                const isEditing = editingId === product.id;
                const isSavingNow = saving === product.id;

                return (
                  <tr key={product.id} className="border-b border-gray-100">
                    <td className="py-2">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-gray-500 ml-1">{product.sizeKg}kg</span>
                    </td>
                    <td className="text-right py-2 text-gray-600">
                      {currentPrice.toLocaleString('vi-VN')}
                    </td>
                    <td className="text-right py-2">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-28 text-right border border-gray-300 rounded px-2 py-1"
                          autoFocus
                          min="0"
                        />
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="text-right py-2">
                      {isEditing ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleSave(product.id)}
                            disabled={isSavingNow}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isSavingNow ? '...' : 'Lưu'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(product.id, currentPrice)}
                          className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Sửa
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
