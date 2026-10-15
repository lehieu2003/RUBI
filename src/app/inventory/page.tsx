'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Snowflake, Plus, Loader2, RefreshCw, Download, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import { exportToCSV } from '@/lib/export-excel';
import { DatePicker } from '@/components/ui/date-picker';

interface InventoryItem {
  productId: string;
  productName: string;
  sizeKg: number;
  unit: string;
  quantityOnHand: number;
  totalKg: number;
  /** Stock on hand minus what unsettled orders already took */
  sellable: number;
  minStock: number | null;
  lowStock: boolean;
  outForDelivery: number;
}

interface StockCountEntry {
  id: string;
  productName: string;
  sizeKg: number;
  unit: string;
  bookQuantity: number;
  countedQuantity: number;
  difference: number;
  note: string | null;
  countedByName: string | null;
  createdAt: string;
}

const HISTORY_PAGE_SIZE = 20;

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
  // Stock count: the manager counts the cold store and corrects the balance
  const [countItem, setCountItem] = useState<InventoryItem | null>(null);
  const [counted, setCounted] = useState('');
  const [countNote, setCountNote] = useState('');
  // History of stock counts, newest first; more pages are appended on demand
  const [history, setHistory] = useState<StockCountEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  // History filters: one product and/or a range of days
  const [historyProductId, setHistoryProductId] = useState('');
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [historySummary, setHistorySummary] = useState({ counts: 0, totalLoss: 0, totalSurplus: 0 });

  const fetchHistory = useCallback(async (page: number) => {
    const filters = new URLSearchParams();
    if (historyProductId) filters.set('productId', historyProductId);
    if (historyFrom) filters.set('from', historyFrom);
    if (historyTo) filters.set('to', historyTo);
    try {
      setHistoryLoading(true);
      const [res, summaryRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.INVENTORY.COUNTS}?${filters}&page=${page}&limit=${HISTORY_PAGE_SIZE}`),
        fetch(`${API_ENDPOINTS.INVENTORY.COUNTS_SUMMARY}?${filters}`),
      ]);
      const json = await res.json().catch(() => null);
      const summaryJson = await summaryRes.json().catch(() => null);
      if (!res.ok || !summaryRes.ok) throw new Error(json?.error ?? summaryJson?.error);
      const entries = json.data as StockCountEntry[];
      setHistory((previous) => (page === 1 ? entries : [...previous, ...entries]));
      setHistoryTotal(json.meta?.total_item ?? entries.length);
      setHistorySummary(summaryJson.data);
    } catch (err) {
      toast({
        type: 'error',
        title: 'Lỗi nạp dữ liệu',
        message: err instanceof Error && err.message ? err.message : 'Không thể tải lịch sử kiểm kho',
      });
    } finally {
      setHistoryLoading(false);
    }
  }, [historyProductId, historyFrom, historyTo]);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

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
      const res = await fetch(API_ENDPOINTS.INVENTORY.BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ADD',
          productId: selectedProductId,
          quantity: Number(quantity),
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

  const countedQty = counted.trim() === '' ? NaN : Number(counted);
  const countValid = Number.isInteger(countedQty) && countedQty >= 0;
  // Bags on trucks or awaiting settlement are on the books but not in the store.
  const expectedInStore = countItem ? countItem.quantityOnHand - countItem.outForDelivery : 0;
  const countDifference = countItem && countValid ? countedQty - expectedInStore : 0;

  const handleStockCount = async () => {
    if (!countItem || !countValid) {
      toast({ type: 'error', title: 'Lỗi', message: 'Nhập số đếm thực tế là số nguyên từ 0 trở lên' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(API_ENDPOINTS.INVENTORY.BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SET',
          productId: countItem.productId,
          quantity: countedQty,
          note: countNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Không thể lưu kiểm kho');

      toast({
        type: 'success',
        title: 'Đã kiểm kho',
        message:
          countDifference === 0
            ? `${countItem.productName} ${countItem.sizeKg}kg khớp sổ`
            : `${countItem.productName} ${countItem.sizeKg}kg: ${countDifference > 0 ? 'thừa' : 'hao hụt'} ${Math.abs(countDifference).toLocaleString('vi-VN')}`,
      });
      setCountItem(null);
      setCounted('');
      setCountNote('');
      fetchInventory();
      fetchHistory(1);
    } catch {
      toast({ type: 'error', title: 'Thất bại', message: 'Không thể lưu kiểm kho' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Kho Lạnh & Tồn Kho</h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Tồn cuối ngày tự chuyển sang ngày hôm sau. Dùng &quot;Kiểm kho&quot; để chỉnh theo số đếm thực tế.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {data.items.length > 0 && (
              <button
                onClick={() => {
                  const headers = ['Mã sản phẩm', 'Tên loại đá', 'Quy cách (Kg/Bao)', 'Tồn kho (Bao)', 'Tổng khối lượng (Kg)'];
                  const rows = data.items.map(i => [
                    i.productId,
                    i.productName,
                    i.sizeKg,
                    i.quantityOnHand,
                    i.totalKg,
                  ]);
                  exportToCSV('Ton_Kho_Lanh', headers, rows);
                }}
                className="flex items-center gap-2 px-3.5 py-2 border border-outline-variant bg-card hover:bg-container-high text-primary-deep font-bold text-xs rounded transition-all shadow-sm"
              >
                <Download className="h-4 w-4" />
                XUẤT CSV
              </button>
            )}
            <button
              onClick={fetchInventory}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 border border-outline-variant bg-card hover:bg-container-high text-primary-deep font-bold text-xs rounded transition-all shadow-sm"
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
          <div className="rounded border border-outline-variant bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded bg-[#004a99] flex items-center justify-center text-white">
                <Snowflake className="h-5 w-5 text-[#9bbdff]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-on-surface-variant uppercase">Tổng bao tồn kho</h3>
                <p className="text-2xl font-bold text-primary-accent font-mono">{data.totalBags.toLocaleString('vi-VN')} bao</p>
              </div>
            </div>
          </div>
          <div className="rounded border border-outline-variant bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded bg-[#1b6d24] flex items-center justify-center text-white">
                <Snowflake className="h-5 w-5 text-[#9bbdff]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-on-surface-variant uppercase">Tổng khối lượng tồn</h3>
                <p className="text-2xl font-bold text-secondary font-mono">{data.totalKg.toLocaleString('vi-VN')} kg</p>
              </div>
            </div>
          </div>
        </div>

        {/* Low-stock alert */}
        {data.items.some((item) => item.lowStock) && (
          <div role="alert" className="mb-6 flex items-start gap-3 rounded border border-error bg-error-container p-4 text-on-error-container">
            <AlertTriangle className="h-5 w-5 shrink-0 text-error" />
            <div className="text-sm">
              <p className="font-bold">Sắp hết hàng</p>
              <p className="mt-0.5">
                {data.items
                  .filter((item) => item.lowStock)
                  .map((item) => `${item.productName} ${item.sizeKg}kg: còn bán được ${item.sellable.toLocaleString('vi-VN')} ${item.unit || 'bao'} (mức cảnh báo ${item.minStock?.toLocaleString('vi-VN')})`)
                  .join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* Product Inventory Table */}
        {loading && data.items.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-accent" />
          </div>
        ) : data.items.length === 0 ? (
          <div className="rounded border border-outline-variant bg-card p-8 text-center shadow-sm">
            <Snowflake className="mx-auto mb-3 h-10 w-10 text-faint" />
            <p className="text-sm font-bold text-on-surface">Chưa có sản phẩm nào trong kho</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              Vui lòng cấu hình sản phẩm trong danh mục hoặc nhấn &quot;Nhập sản lượng mới&quot;
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-outline-variant bg-card shadow-sm">
            <table className="w-full text-left border-collapse table-industrial">
              <thead>
                <tr className="border-b border-outline-variant bg-surface text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3 px-4">Tên sản phẩm</th>
                  <th className="py-3 px-4">Quy cách (Kg/Bao)</th>
                  <th className="py-3 px-4 text-right">Tồn kho hiện tại (Bao)</th>
                  <th className="py-3 px-4 text-right">Còn bán được</th>
                  <th className="py-3 px-4 text-right">Tổng khối lượng (Kg)</th>
                  <th className="py-3 px-4 text-right w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-soft text-sm">
                {data.items.map((item) => (
                  <tr key={item.productId} className="h-12 hover:bg-container-low transition-colors">
                    <td className="py-3 px-4 font-bold text-on-surface">
                      {item.productName}
                      {item.lowStock && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-error-container text-error">
                          Sắp hết
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-primary-accent">{item.sizeKg} kg</td>
                    <td
                      className={
                        'py-3 px-4 text-right font-bold font-mono ' +
                        (item.quantityOnHand < 0 ? 'text-error' : 'text-primary-accent')
                      }
                      title={item.quantityOnHand < 0 ? 'Xuất nhiều hơn số đã nhập. Nhập sản lượng còn thiếu hoặc kiểm kho.' : undefined}
                    >
                      {item.quantityOnHand.toLocaleString('vi-VN')} {item.unit || 'bao'}
                    </td>
                    <td
                      className={'py-3 px-4 text-right font-bold font-mono ' + (item.lowStock ? 'text-error' : 'text-on-surface')}
                      title="Tồn trên sổ trừ các đơn chưa đối soát"
                    >
                      {item.sellable.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-on-surface font-mono">
                      {item.totalKg.toLocaleString('vi-VN')} kg
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setCountItem(item);
                          setCounted('');
                          setCountNote('');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-container-high text-xs font-bold transition-colors"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Kiểm kho
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stock count history */}
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-2">Lịch sử kiểm kho</h2>

          {/* Filters and totals for the filtered counts */}
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <select
              aria-label="Lọc theo sản phẩm"
              value={historyProductId}
              onChange={(e) => setHistoryProductId(e.target.value)}
              className="h-[42px] px-3 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99]"
            >
              <option value="">Tất cả sản phẩm</option>
              {data.items.map((item) => (
                <option key={item.productId} value={item.productId}>
                  {item.productName} ({item.sizeKg}kg)
                </option>
              ))}
            </select>
            <DatePicker value={historyFrom} onChange={setHistoryFrom} placeholder="Từ ngày" ariaLabel="Từ ngày" clearable />
            <DatePicker value={historyTo} onChange={setHistoryTo} placeholder="Đến ngày" ariaLabel="Đến ngày" clearable />
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold sm:ml-auto">
              <span className="px-2.5 py-1.5 rounded bg-container-high text-on-surface-variant">
                {historySummary.counts.toLocaleString('vi-VN')} lần kiểm
              </span>
              <span className="px-2.5 py-1.5 rounded bg-error-container text-on-error-container">
                Hao hụt: {historySummary.totalLoss.toLocaleString('vi-VN')}
              </span>
              <span className="px-2.5 py-1.5 rounded bg-[#a0f399]/20 text-secondary">
                Thừa: {historySummary.totalSurplus.toLocaleString('vi-VN')}
              </span>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="rounded border border-outline-variant bg-card p-6 text-center text-xs text-faint shadow-sm">
              {historyLoading
                ? 'Đang tải...'
                : historyProductId || historyFrom || historyTo
                  ? 'Không có lần kiểm kho nào khớp bộ lọc'
                  : 'Chưa có lần kiểm kho nào'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-outline-variant bg-card shadow-sm">
              <table className="w-full text-left border-collapse table-industrial">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Sản phẩm</th>
                    <th className="py-3 px-4 text-right">Phải có trong kho</th>
                    <th className="py-3 px-4 text-right">Thực tế</th>
                    <th className="py-3 px-4 text-right">Chênh lệch</th>
                    <th className="py-3 px-4">Ghi chú</th>
                    <th className="py-3 px-4">Người kiểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-soft text-sm">
                  {history.map((entry) => (
                    <tr key={entry.id} className="h-11 hover:bg-container-low transition-colors">
                      <td className="py-2.5 px-4 text-xs font-mono text-on-surface-variant whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-on-surface">
                        {entry.productName} {entry.sizeKg}kg
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">{entry.bookQuantity.toLocaleString('vi-VN')}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">{entry.countedQuantity.toLocaleString('vi-VN')}</td>
                      <td
                        className={
                          'py-2.5 px-4 text-right font-mono font-bold ' +
                          (entry.difference < 0 ? 'text-error' : entry.difference > 0 ? 'text-secondary' : 'text-faint')
                        }
                      >
                        {entry.difference > 0 ? '+' : ''}
                        {entry.difference.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-on-surface-variant">{entry.note || '—'}</td>
                      <td className="py-2.5 px-4 text-xs text-on-surface-variant">{entry.countedByName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {history.length < historyTotal && (
            <button
              onClick={() => fetchHistory(Math.floor(history.length / HISTORY_PAGE_SIZE) + 1)}
              disabled={historyLoading}
              className="mt-3 px-3.5 py-2 border border-outline-variant bg-card hover:bg-container-high text-primary-deep font-bold text-xs rounded transition-all shadow-sm disabled:opacity-50"
            >
              {historyLoading ? 'Đang tải...' : `Xem thêm (${history.length}/${historyTotal})`}
            </button>
          )}
        </div>
      </div>

      {/* Add Production Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-outline-variant rounded shadow-xl p-6">
            <h3 className="text-lg font-bold text-on-surface mb-1">Nhập sản lượng kho</h3>
            <p className="text-on-surface-variant text-xs mb-5">Ghi nhận mẻ đá vừa ra lò vào kho lạnh</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Sản phẩm</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99]"
                >
                  {data.items.map(t => (
                    <option key={t.productId} value={t.productId}>{t.productName} ({t.sizeKg}kg)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Số lượng cộng thêm (Bao)</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ví dụ: 50"
                  className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99]"
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant font-bold text-xs rounded hover:bg-container-high transition-colors disabled:opacity-50"
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

      {/* Stock Count Modal */}
      {countItem && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setCountItem(null)} />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-outline-variant rounded shadow-xl p-6"
          >
            <h3 className="text-lg font-bold text-on-surface mb-1">
              Kiểm kho: {countItem.productName} {countItem.sizeKg}kg
            </h3>
            <p className="text-on-surface-variant text-xs mb-5">
              Nhập số đếm thực tế trong kho lạnh, không tính hàng đang giao. Chênh lệch là hao hụt (tan chảy, vỡ...) hoặc thừa.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded border border-outline-variant bg-surface px-3 py-2 text-sm">
                <span className="text-on-surface-variant">Tồn trên sổ</span>
                <span className="font-bold font-mono text-on-surface">
                  {countItem.quantityOnHand.toLocaleString('vi-VN')} {countItem.unit || 'bao'}
                </span>
              </div>
              {countItem.outForDelivery !== 0 && (
                <>
                  <div className="flex items-center justify-between px-3 text-sm">
                    <span className="text-on-surface-variant">Đang giao, chưa đối soát</span>
                    <span className="font-mono text-on-surface">
                      −{countItem.outForDelivery.toLocaleString('vi-VN')} {countItem.unit || 'bao'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-outline-variant bg-surface px-3 py-2 text-sm">
                    <span className="text-on-surface-variant">Phải có trong kho</span>
                    <span className="font-bold font-mono text-on-surface">
                      {expectedInStore.toLocaleString('vi-VN')} {countItem.unit || 'bao'}
                    </span>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Số đếm thực tế
                </label>
                <input
                  autoFocus
                  type="number"
                  min="0"
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStockCount()}
                  className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Ghi chú (không bắt buộc)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={countNote}
                  onChange={(e) => setCountNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStockCount()}
                  placeholder="Ví dụ: tan chảy, vỡ bao, kiểm cuối tuần"
                  className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99]"
                />
              </div>
              {countValid && (
                <p className={'text-xs font-bold ' + (countDifference < 0 ? 'text-error' : 'text-secondary')}>
                  {countDifference === 0
                    ? 'Khớp với sổ'
                    : `Chênh lệch: ${countDifference > 0 ? '+' : ''}${countDifference.toLocaleString('vi-VN')} (${countDifference > 0 ? 'thừa' : 'hao hụt'})`}
                </p>
              )}
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setCountItem(null)}
                className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant font-bold text-xs rounded hover:bg-container-high transition-colors disabled:opacity-50"
              >
                HỦY
              </button>
              <button
                type="button"
                disabled={submitting || !countValid}
                onClick={handleStockCount}
                className="flex-1 py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                XÁC NHẬN KIỂM KHO
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
