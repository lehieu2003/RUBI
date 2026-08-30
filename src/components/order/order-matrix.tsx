'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { Product } from '@prisma/client';

interface OrderMatrixProps {
  products: Product[];
  prices: Record<string, number>;
  values: Map<string, number>;
  onChange: (productId: string, quantity: number) => void;
  onConfirm: () => void;
  disabled?: boolean;
}

// Build 2x3 grid from products
// Rows: Đá Bi (name includes "Bi"), Đá Viên (name includes "Viên")
// Cols: 5kg, 10kg, 20kg
function buildGrid(products: Product[]) {
  const rows = [
    { label: 'Đá Bi', types: ['Đá Bi'] },
    { label: 'Đá Viên', types: ['Đá Viên'] },
  ];
  const cols = [5, 10, 20];

  return rows.map((row) => {
    const cells = cols.map((sizeKg) => {
      const product = products.find(
        (p) => p.name === row.types[0] && p.sizeKg === sizeKg && p.isActive
      );
      return product ? { product, sizeKg } : null;
    });
    return { label: row.label, cells };
  });
}

export function OrderMatrix({
  products,
  prices,
  values,
  onChange,
  onConfirm,
  disabled = false,
}: OrderMatrixProps) {
  const grid = buildGrid(products);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus first qty input on mount
  useEffect(() => {
    if (!disabled) {
      requestAnimationFrame(() => firstInputRef.current?.focus());
    }
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    },
    [onConfirm]
  );

  return (
    <div className="overflow-x-auto rounded border border-[#c2c6d3] bg-white p-3 shadow-2xs">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[#e7eeff]">
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-[#424751]">Loại đá</th>
            <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-[#424751]">5kg</th>
            <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-[#424751]">10kg</th>
            <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wider text-[#424751]">20kg</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e7eeff]">
          {grid.map((row, rowIdx) => (
            <tr key={row.label} className="hover:bg-[#f9f9ff] transition-colors">
              <td className="whitespace-nowrap px-3 py-3 font-bold text-[#111c2d]">
                {row.label}
              </td>
              {row.cells.map((cell, colIdx) => {
                if (!cell) {
                  return (
                    <td key={colIdx} className="px-3 py-3 text-center">
                      <span className="text-[#c2c6d3] font-mono">—</span>
                    </td>
                  );
                }
                const { product } = cell;
                const price = prices[product.id] ?? 0;
                const qty = values.get(product.id) ?? 0;
                const lineTotal = qty * price;
                const isFirst = rowIdx === 0 && colIdx === 0;

                return (
                  <td key={product.id} className="px-3 py-3">
                    <div className="flex flex-col items-center gap-1">
                      <input
                        ref={isFirst ? firstInputRef : undefined}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={qty || ''}
                        onChange={(e) =>
                          onChange(product.id, parseInt(e.target.value) || 0)
                        }
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        tabIndex={0}
                        className="w-20 rounded border border-[#c2c6d3] bg-white px-2 py-1.5 text-center text-sm font-bold text-[#111c2d] focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99] disabled:bg-[#f0f3ff] transition-all shadow-2xs font-mono"
                      />
                      <span className="text-[11px] font-mono text-[#737783]">
                        {price > 0 ? `${price.toLocaleString('vi-VN')}đ` : 'Chưa có giá'}
                      </span>
                      {lineTotal > 0 && (
                        <span className="text-xs font-bold text-[#1b6d24] font-mono">
                          {lineTotal.toLocaleString('vi-VN')}đ
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}