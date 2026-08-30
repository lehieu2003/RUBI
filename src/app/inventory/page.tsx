'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Snowflake, Plus, Loader2, RefreshCw } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface InventoryItem {
  productId: string;
  productName: string;
  sizeKg: number;
  unit: string;
  quantityOnHand: number;
  totalKg: number;
}

interface InventoryResponse {
  items: InventoryItem[];
  totalBags: number;
  totalKg: number;
}

export default function InventoryPage() {
  const [data, setData] = useState<InventoryResponse>({ items: [], totalBags: 0, totalKg: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.INVENTORY.BASE);
      const json = await res.json();
      const payload: InventoryResponse = json?.data !== undefined ? json.data : json;
      if (res.ok && payload?.items) {
        setData(payload);
        if (payload.items.length > 0 && !selectedProductId) {
          setSelectedProductId(payload.items[0].productId);
        }
      }
    } catch {
      toast({ type: 'error', title: 'Lỗi nạp dữ liệu', message: 'Không thể kết nối đến máy chủ' });
    } finally {
      setLoading(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleAddStock = async () => {
    if (!selectedProductId || !quantity || isNaN(Number(quantity))) {
      toast({ type: 'error', title: 'Lỗi', message: 'Vui lòng nhập số lượng hợp lệ' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(API_ENDPOINTS.INVENTORY.TRANSACTIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          type: 'IN',
          quantity: Number(quantity),
          reason: 'PRODUCED',
        }),
      });

      if (!res.ok) throw new Error('Không thể thêm tồn kho');

      toast({ type: 'success', title: 'Thành công', message: 'Đã nhập kho mẻ đá mới' });
      setShowAddModal(false);
      setQuantity('');
      fetchInventory();
    } catch {
      toast({ type: 'error', title: 'Thất bại', message: 'Không thể lưu mẻ đá' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c2c6d3] pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">Kho Lạnh & Tồn Kho</h1>
            <p className="text-xs text-[#424751] mt-1">Theo dõi số lượng tồn kho theo từng loại đá thực tế</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchInventory}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 border border-[#c2c6d3] bg-white hover:bg-[#dee8ff] text-[#00346f] font-bold text-xs rounded transition-all shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              LÀM MỚI
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              NHẬP SẢN LƯỢNG MỚI
            </button>
          </div>
        </div>

        {/* Overview summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <div className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded bg-[#004a99] flex items-center justify-center text-white">
                <Snowflake className="h-5 w-5 text-[#9bbdff]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#424751] uppercase">Tổng bao tồn kho</h3>
                <p className="text-2xl font-bold text-[#004a99] font-mono">{data.totalBags.toLocaleString('vi-VN')} bao</p>
              </div>
            </div>
          </div>
          <div className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded bg-[#1b6d24] flex items-center justify-center text-white">
                <Snowflake className="h-5 w-5 text-[#9bbdff]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#424751] uppercase">Tổng khối lượng tồn</h3>
                <p className="text-2xl font-bold text-[#1b6d24] font-mono">{data.totalKg.toLocaleString('vi-VN')} kg</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Inventory Table */}
        {loading && data.items.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#004a99]" />
          </div>
        ) : data.items.length === 0 ? (
          <div className="rounded border border-[#c2c6d3] bg-white p-8 text-center shadow-sm">
            <Snowflake className="mx-auto mb-3 h-10 w-10 text-[#737783]" />
            <p className="text-sm font-bold text-[#111c2d]">Chưa có sản phẩm nào trong kho</p>
            <p className="mt-1 text-xs text-[#424751]">
              Vui lòng cấu hình sản phẩm trong danh mục hoặc nhấn &quot;Nhập sản lượng mới&quot;
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-[#c2c6d3] bg-white shadow-sm">
            <table className="w-full text-left border-collapse table-industrial">
              <thead>
                <tr className="border-b border-[#c2c6d3] bg-[#f9f9ff] text-[12px] font-bold uppercase tracking-wider text-[#424751]">
                  <th className="py-3 px-4">Tên sản phẩm</th>
                  <th className="py-3 px-4">Quy cách (Kg/Bao)</th>
                  <th className="py-3 px-4 text-right">Tồn kho hiện tại (Bao)</th>
                  <th className="py-3 px-4 text-right">Tổng khối lượng (Kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7eeff] text-sm">
                {data.items.map((item) => (
                  <tr key={item.productId} className="h-12 hover:bg-[#f0f3ff] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#111c2d]">{item.productName}</td>
                    <td className="py-3 px-4 text-xs font-mono text-[#004a99]">{item.sizeKg} kg</td>
                    <td className="py-3 px-4 text-right font-bold text-[#004a99] font-mono">
                      {item.quantityOnHand.toLocaleString('vi-VN')} {item.unit || 'bao'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#111c2d] font-mono">
                      {item.totalKg.toLocaleString('vi-VN')} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Production Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white border border-[#c2c6d3] rounded shadow-xl p-6">
            <h3 className="text-lg font-bold text-[#111c2d] mb-1">Nhập sản lượng kho</h3>
            <p className="text-[#424751] text-xs mb-5">Ghi nhận mẻ đá vừa ra lò vào kho lạnh</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#424751] mb-1.5">Sản phẩm</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#c2c6d3] rounded text-sm text-[#111c2d] focus:border-[#004a99]"
                >
                  {data.items.map(t => (
                    <option key={t.productId} value={t.productId}>{t.productName} ({t.sizeKg}kg)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#424751] mb-1.5">Số lượng cộng thêm (Bao)</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ví dụ: 50"
                  className="w-full px-3 py-2 bg-white border border-[#c2c6d3] rounded text-sm text-[#111c2d] focus:border-[#004a99]"
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-[#c2c6d3] text-[#424751] font-bold text-xs rounded hover:bg-[#dee8ff] transition-colors disabled:opacity-50"
              >
                HỦY
              </button>
              <button
                type="button"
                disabled={submitting || !quantity}
                onClick={handleAddStock}
                className="flex-1 py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                XÁC NHẬN NHẬP KHO
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
