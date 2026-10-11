'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

export interface ProductRow {
  id: string;
  name: string;
  sizeKg: number;
  unit: string;
  /** Low-stock alert level; null when the product has no alert */
  minStock: number | null;
  isActive: boolean;
  /** Default price; null when none has been set yet */
  price: number | null;
  /** A product with orders keeps its size: past orders were written for it */
  hasOrders: boolean;
  /** Units on the books in the cold store */
  stock: number;
  /** Order lines of this product on orders that are not settled yet */
  openOrders: number;
}

interface ProductForm {
  name: string;
  sizeKg: string;
  unit: string;
  price: string;
  /** Empty = no low-stock alert */
  minStock: string;
}

const EMPTY_FORM: ProductForm = { name: '', sizeKg: '', unit: 'Bao', price: '', minStock: '' };

const inputClass =
  'border border-outline-variant rounded px-2.5 py-1.5 text-sm text-on-surface bg-card outline-none focus:border-[#004a99] disabled:bg-container-high disabled:text-faint';

/** Sends JSON and returns the server's error message when it refuses. */
async function send(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<string | null> {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.ok) return null;
  const json = await response.json().catch(() => null);
  return json?.error ?? 'Không thể lưu thay đổi';
}

/** Reads the form; returns a message when a field is not usable. */
function readForm(
  form: ProductForm
): { name: string; sizeKg: number; unit: string; price: number; minStock: number | null } | string {
  const name = form.name.trim();
  const unit = form.unit.trim();
  const sizeKg = Number(form.sizeKg);
  const price = Number(form.price);
  if (!name) return 'Nhập tên sản phẩm';
  if (!Number.isInteger(sizeKg) || sizeKg <= 0) return 'Cỡ bao phải là số nguyên lớn hơn 0';
  if (!unit) return 'Nhập đơn vị';
  if (!Number.isFinite(price) || price <= 0) return 'Giá bán phải lớn hơn 0';
  const minStock = form.minStock.trim() === '' ? null : Number(form.minStock);
  if (minStock !== null && (!Number.isInteger(minStock) || minStock < 0)) return 'Mức cảnh báo tồn phải là số nguyên từ 0';
  return { name, sizeKg, unit, price, minStock };
}

export function ProductTable({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState<ProductForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(EMPTY_FORM);
  const [busy, setBusy] = useState<string | null>(null);
  // A product that still has stock or open orders is confirmed before it goes off sale
  const [confirmStop, setConfirmStop] = useState<ProductRow | null>(null);

  const fail = (message: string) => toast({ type: 'error', title: 'Lưu thất bại', message });

  const handleAdd = async () => {
    const values = readForm(addForm);
    if (typeof values === 'string') return fail(values);
    setBusy('new');
    const error = await send(API_ENDPOINTS.PRODUCTS.BASE, 'POST', values);
    setBusy(null);
    if (error) return fail(error);
    toast({ type: 'success', title: `Đã thêm ${values.name} ${values.sizeKg}kg` });
    setAddForm(EMPTY_FORM);
    setAdding(false);
    router.refresh();
  };

  const handleStartEdit = (product: ProductRow) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      sizeKg: String(product.sizeKg),
      unit: product.unit,
      price: product.price === null ? '' : String(product.price),
      minStock: product.minStock === null ? '' : String(product.minStock),
    });
  };

  const handleSaveEdit = async (product: ProductRow) => {
    const values = readForm(editForm);
    if (typeof values === 'string') return fail(values);
    setBusy(product.id);

    // Send only what changed: the product and its price are separate records.
    const changes: Record<string, unknown> = {};
    if (values.name !== product.name) changes.name = values.name;
    if (values.sizeKg !== product.sizeKg) changes.sizeKg = values.sizeKg;
    if (values.unit !== product.unit) changes.unit = values.unit;
    if (values.minStock !== product.minStock) changes.minStock = values.minStock;

    let error: string | null = null;
    if (Object.keys(changes).length > 0) {
      error = await send(API_ENDPOINTS.PRODUCTS.BY_ID(product.id), 'PATCH', changes);
    }
    if (!error && values.price !== product.price) {
      error = await send(API_ENDPOINTS.PRICES.GLOBAL, 'POST', { productId: product.id, price: values.price });
    }
    setBusy(null);
    router.refresh();
    if (error) return fail(error);
    toast({ type: 'success', title: 'Đã cập nhật sản phẩm' });
    setEditingId(null);
  };

  const requestToggleActive = (product: ProductRow) => {
    if (product.isActive && (product.stock > 0 || product.openOrders > 0)) {
      setConfirmStop(product);
      return;
    }
    handleToggleActive(product);
  };

  const handleToggleActive = async (product: ProductRow) => {
    setConfirmStop(null);
    setBusy(product.id);
    const error = await send(API_ENDPOINTS.PRODUCTS.BY_ID(product.id), 'PATCH', { isActive: !product.isActive });
    setBusy(null);
    if (error) return fail(error);
    toast({
      type: 'success',
      title: product.isActive
        ? `Đã ngừng bán ${product.name} ${product.sizeKg}kg`
        : `Đã bán lại ${product.name} ${product.sizeKg}kg`,
    });
    router.refresh();
  };

  // One table per product name (Đá Bi, Đá Viên, ...)
  const names = [...new Set(products.map((product) => product.name))];

  return (
    <div className="space-y-6">
      {adding ? (
        <div className="rounded border border-[#004a99]/40 bg-container-high/40 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">Thêm sản phẩm</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <label className="text-xs font-bold text-on-surface-variant">
              Tên sản phẩm
              <input
                autoFocus
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Đá Bi"
                className={`${inputClass} mt-1 w-full font-normal`}
              />
            </label>
            <label className="text-xs font-bold text-on-surface-variant">
              Cỡ (kg)
              <input
                type="number"
                min="1"
                value={addForm.sizeKg}
                onChange={(e) => setAddForm({ ...addForm, sizeKg: e.target.value })}
                placeholder="10"
                className={`${inputClass} mt-1 w-full font-normal`}
              />
            </label>
            <label className="text-xs font-bold text-on-surface-variant">
              Đơn vị
              <input
                value={addForm.unit}
                onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                className={`${inputClass} mt-1 w-full font-normal`}
              />
            </label>
            <label className="text-xs font-bold text-on-surface-variant">
              Giá cơ bản (đ)
              <input
                type="number"
                min="0"
                value={addForm.price}
                onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="22000"
                className={`${inputClass} mt-1 w-full font-normal`}
              />
            </label>
            <label className="text-xs font-bold text-on-surface-variant">
              Cảnh báo khi tồn còn
              <input
                type="number"
                min="0"
                value={addForm.minStock}
                onChange={(e) => setAddForm({ ...addForm, minStock: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Không cảnh báo"
                className={`${inputClass} mt-1 w-full font-normal`}
              />
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAdd}
              disabled={busy === 'new'}
              className="px-4 py-1.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors disabled:opacity-50"
            >
              {busy === 'new' ? 'Đang lưu...' : 'Lưu sản phẩm'}
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setAddForm(EMPTY_FORM);
              }}
              className="px-4 py-1.5 border border-outline-variant text-on-surface-variant font-bold text-xs rounded hover:bg-container-high transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors"
        >
          <Plus className="h-4 w-4" />
          THÊM SẢN PHẨM
        </button>
      )}

      {products.length === 0 && (
        <p className="text-sm text-faint">Chưa có sản phẩm nào. Thêm sản phẩm đầu tiên để bắt đầu lên đơn.</p>
      )}

      {names.map((name) => (
        <div key={name}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">{name}</h3>
          <div className="overflow-x-auto rounded border border-outline-variant bg-card">
            <table className="w-full text-left border-collapse table-industrial">
              <thead>
                <tr className="border-b border-outline-variant bg-surface text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="py-2.5 px-4">Quy cách</th>
                  <th className="py-2.5 px-4 text-right">Giá cơ bản</th>
                  <th className="py-2.5 px-4 text-right">Cảnh báo tồn</th>
                  <th className="py-2.5 px-4 text-right w-56">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-soft text-sm">
                {products
                  .filter((product) => product.name === name)
                  .map((product) => {
                    const isBusy = busy === product.id;

                    if (editingId === product.id) {
                      return (
                        <tr key={product.id} className="bg-container-high/30">
                          <td className="py-2.5 px-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                aria-label="Tên sản phẩm"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className={`${inputClass} w-36`}
                              />
                              <input
                                aria-label="Cỡ (kg)"
                                type="number"
                                min="1"
                                value={editForm.sizeKg}
                                onChange={(e) => setEditForm({ ...editForm, sizeKg: e.target.value })}
                                disabled={product.hasOrders}
                                title={product.hasOrders ? 'Sản phẩm đã có đơn hàng nên không đổi được cỡ bao' : undefined}
                                className={`${inputClass} w-20 text-right`}
                              />
                              <span className="text-xs text-on-surface-variant">kg</span>
                              <input
                                aria-label="Đơn vị"
                                value={editForm.unit}
                                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                                className={`${inputClass} w-20`}
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <input
                              aria-label="Giá cơ bản"
                              type="number"
                              min="0"
                              value={editForm.price}
                              onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(product)}
                              className={`${inputClass} w-32 text-right font-bold`}
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <input
                              aria-label="Cảnh báo khi tồn còn"
                              type="number"
                              min="0"
                              value={editForm.minStock}
                              onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(product)}
                              placeholder="Không"
                              className={`${inputClass} w-24 text-right`}
                            />
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => handleSaveEdit(product)}
                                disabled={isBusy}
                                className="px-2.5 py-1 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors disabled:opacity-50"
                              >
                                {isBusy ? '...' : 'Lưu'}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-2.5 py-1 border border-outline-variant text-on-surface-variant font-bold text-xs rounded hover:bg-container-high transition-colors"
                              >
                                Hủy
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={product.id}
                        className={'h-12 hover:bg-container-low transition-colors ' + (product.isActive ? '' : 'opacity-60')}
                      >
                        <td className="py-2.5 px-4 font-bold text-on-surface">
                          {product.name} ({product.sizeKg}kg)
                          <span className="ml-2 text-xs font-normal text-on-surface-variant">{product.unit}</span>
                          {!product.isActive && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/20 text-faint">
                              Ngừng bán
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right data-md font-bold text-primary-accent">
                          {product.price === null ? (
                            <span className="text-error text-xs">Chưa có giá</span>
                          ) : (
                            <>{product.price.toLocaleString('vi-VN')} đ</>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right text-on-surface-variant">
                          {product.minStock === null
                            ? '—'
                            : `≤ ${product.minStock.toLocaleString('vi-VN')} ${product.unit}`}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => handleStartEdit(product)}
                              className="px-3 py-1 text-xs font-bold text-primary-accent bg-container-high hover:bg-container-highest rounded transition-colors"
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => requestToggleActive(product)}
                              disabled={isBusy}
                              className="px-3 py-1 text-xs font-bold border border-outline-variant text-on-surface-variant rounded hover:bg-container-high transition-colors disabled:opacity-50"
                            >
                              {product.isActive ? 'Ngừng bán' : 'Bán lại'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Confirm taking a product off sale while it still has stock or open orders */}
      {confirmStop && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setConfirmStop(null)} />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-outline-variant rounded shadow-xl p-6"
          >
            <h3 className="text-lg font-bold text-on-surface mb-2">
              Ngừng bán {confirmStop.name} {confirmStop.sizeKg}kg?
            </h3>
            <ul className="space-y-1.5 text-sm text-on-surface mb-3 list-disc pl-5">
              {confirmStop.stock > 0 && (
                <li>
                  Kho còn <strong>{confirmStop.stock.toLocaleString('vi-VN')} {confirmStop.unit}</strong> trên sổ.
                </li>
              )}
              {confirmStop.openOrders > 0 && (
                <li>
                  Đang nằm trong <strong>{confirmStop.openOrders.toLocaleString('vi-VN')}</strong> đơn chưa đối soát.
                </li>
              )}
            </ul>
            <p className="text-xs text-on-surface-variant mb-5">
              Sản phẩm sẽ không còn trong lưới lên đơn và màn Kho lạnh. Các đơn đang có vẫn giao và đối soát bình
              thường; bấm &quot;Bán lại&quot; bất cứ lúc nào để mở lại.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmStop(null)}
                className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant font-bold text-xs rounded hover:bg-container-high transition-colors"
              >
                HỦY
              </button>
              <button
                type="button"
                onClick={() => handleToggleActive(confirmStop)}
                className="flex-1 py-2.5 bg-[#ba1a1a] hover:bg-[#93000a] text-white font-bold text-xs rounded transition-colors shadow-sm"
              >
                VẪN NGỪNG BÁN
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
