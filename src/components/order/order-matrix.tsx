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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left font-medium text-gray-500"></th>
            <th className="px-2 py-1 text-center font-medium text-gray-500">5kg</th>
            <th className="px-2 py-1 text-center font-medium text-gray-500">10kg</th>
            <th className="px-2 py-1 text-center font-medium text-gray-500">20kg</th>
          </tr>
        </thead>
        <tbody>
          {grid.map((row, rowIdx) => (
            <tr key={row.label}>
              <td className="whitespace-nowrap px-2 py-1 font-medium text-gray-700">
                {row.label}
              </td>
              {row.cells.map((cell, colIdx) => {
                if (!cell) {
                  return (
                    <td key={colIdx} className="px-2 py-1">
                      <span className="text-gray-300">-</span>
                    </td>
                  );
                }
                const { product } = cell;
                const price = prices[product.id] ?? 0;
                const qty = values.get(product.id) ?? 0;
                const lineTotal = qty * price;
                const isFirst = rowIdx === 0 && colIdx === 0;

                return (
                  <td key={product.id} className="px-2 py-1">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs text-gray-500">{product.name}</span>
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
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                      <span className="text-xs text-gray-400">
                        {price > 0 ? `${price.toLocaleString()}đ` : '-'}
                      </span>
                      {lineTotal > 0 && (
                        <span className="text-xs font-medium text-blue-600">
                          {lineTotal.toLocaleString()}đ
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