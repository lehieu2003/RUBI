'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { Product } from '@prisma/client';
import { groupProductsByName } from '@/lib/product-groups';

interface OrderMatrixProps {
  products: Product[];
  prices: Record<string, number>;
  /** Units still sellable per product; a product without a figure shows none */
  stock?: Record<string, number>;
  values: Map<string, number>;
  onChange: (productId: string, quantity: number) => void;
  onConfirm: () => void;
  disabled?: boolean;
}

// Build the grid from the catalogue itself, so a product the manager adds is
// orderable at once: one row per product name, one column per bag size.
function buildGrid(products: Product[]) {
  const groups = groupProductsByName(products);
  const cols = [...new Set(groups.flatMap((g) => g.products.map((p) => p.sizeKg)))].sort((a, b) => a - b);

  const rows = groups.map(({ name, products: sizes }) => {
    const cells = cols.map((sizeKg) => {
      const product = sizes.find((p) => p.sizeKg === sizeKg);
      return product ? { product, sizeKg } : null;
    });
    return { label: name, cells };
  });
  return { cols, rows };
}

export function OrderMatrix({
  products,
  prices,
  stock = {},
  values,
  onChange,
  onConfirm,
  disabled = false,
}: OrderMatrixProps) {
  const { cols, rows: grid } = buildGrid(products);
  // The cursor starts on the first product of the grid.
  const firstProductId = grid.flatMap((row) => row.cells).find((cell) => cell)?.product.id;
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
    <div className="overflow-x-auto rounded border border-outline-variant bg-card p-2 shadow-2xs">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-outline-soft">
            <th className="px-2 py-2 text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant">Loại đá</th>
            {cols.map((sizeKg) => (
              <th key={sizeKg} className="px-1 py-2 text-center text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {sizeKg}kg
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-soft">
          {grid.map((row) => (
            <tr key={row.label} className="hover:bg-surface transition-colors">
              <td className="whitespace-nowrap px-2 py-3 font-bold text-on-surface">
                {row.label}
              </td>
              {row.cells.map((cell, colIdx) => {
                if (!cell) {
                  return (
                    <td key={colIdx} className="px-1 py-3 text-center">
                      <span className="text-[#c2c6d3] font-mono">—</span>
                    </td>
                  );
                }
                const { product } = cell;
                const price = prices[product.id] ?? 0;
                const qty = values.get(product.id) ?? 0;
                const lineTotal = qty * price;
                const left = stock[product.id];
                const short = left !== undefined && (left <= 0 || qty > left);
                const isFirst = product.id === firstProductId;

                return (
                  <td key={product.id} className="px-1 py-3">
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
                        className="w-16 rounded border border-outline-variant bg-card px-1 py-1.5 text-center text-sm font-bold text-on-surface focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99] disabled:bg-container-low transition-all shadow-2xs font-mono"
                      />
                      <span className="text-[11px] font-mono text-faint">
                        {price > 0 ? `${price.toLocaleString('vi-VN')}đ` : 'Chưa có giá'}
                      </span>
                      {left !== undefined && (
                        <span
                          className={'text-[11px] font-mono ' + (short ? 'font-bold text-error' : 'text-on-surface-variant')}
                          title="Tồn kho trên sổ trừ các đơn chưa đối soát"
                        >
                          Còn {left.toLocaleString('vi-VN')}
                        </span>
                      )}
                      {lineTotal > 0 && (
                        <span className="text-xs font-bold text-secondary font-mono">
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