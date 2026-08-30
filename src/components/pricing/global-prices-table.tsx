'use client';

import { useState } from 'react';
import { Product } from '@prisma/client';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

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
      const response = await fetch(API_ENDPOINTS.PRICES.GLOBAL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, price: newPrice }),
      });
      if (!response.ok) throw new Error('Lỗi lưu giá');
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
  const other = products.filter((p) => p.name !== 'Đá Bi' && p.name !== 'Đá Viên');

  const groups = [
    { label: 'Đá Bi (Bao / Túi)', products: daBi },
    { label: 'Đá Viên / Đá Cây', products: daVien },
    ...(other.length > 0 ? [{ label: 'Sản phẩm khác', products: other }] : []),
  ];

  return (
    <div className="space-y-6">
      {groups.map(({ label, products: rowProducts }) => (
        <div key={label}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#424751] mb-2">{label}</h3>
          <div className="overflow-hidden rounded border border-[#c2c6d3] bg-white">
            <table className="w-full text-left border-collapse table-industrial">
              <thead>
                <tr className="border-b border-[#c2c6d3] bg-[#f9f9ff] text-[12px] font-bold uppercase tracking-wider text-[#424751]">
                  <th className="py-2.5 px-4">Quy cách</th>
                  <th className="py-2.5 px-4 text-right">Giá niêm yết hiện tại</th>
                  <th className="py-2.5 px-4 text-right">Nhập giá mới</th>
                  <th className="py-2.5 px-4 text-center w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7eeff] text-sm">
                {rowProducts.map((product) => {
                  const currentPrice = prices.get(product.id) ?? 0;
                  const isEditing = editingId === product.id;
                  const isSavingNow = saving === product.id;

                  return (
                    <tr key={product.id} className="h-12 hover:bg-[#f0f3ff] transition-colors">
                      <td className="py-2.5 px-4 font-bold text-[#111c2d]">
                        {product.name} ({product.sizeKg}kg)
                      </td>
                      <td className="py-2.5 px-4 text-right data-md font-bold text-[#004a99]">
                        {currentPrice.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-32 text-right border border-[#004a99] rounded px-2.5 py-1 text-sm font-bold text-[#111c2d] outline-none"
                            autoFocus
                            min="0"
                          />
                        ) : (
                          <span className="text-[#737783] text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {isEditing ? (
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() => handleSave(product.id)}
                              disabled={isSavingNow}
                              className="px-2.5 py-1 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors disabled:opacity-50"
                            >
                              {isSavingNow ? '...' : 'Lưu'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2.5 py-1 border border-[#c2c6d3] text-[#424751] font-bold text-xs rounded hover:bg-[#dee8ff] transition-colors"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(product.id, currentPrice)}
                            className="px-3 py-1 text-xs font-bold text-[#004a99] bg-[#dee8ff] hover:bg-[#c2d7ff] rounded transition-colors"
                          >
                            Chỉnh sửa
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
