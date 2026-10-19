'use client';

import { useState, useEffect, useCallback } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Plus, Wrench, Truck, Download, Pencil, Trash2, RefreshCw, CalendarClock } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { ASSET_ENDPOINTS } from '@/lib/api-endpoints/assets';
import { unwrapEnvelope } from '@/lib/api-response';
import { Drawer } from '@/components/ui/drawer';
import { exportToCSV } from '@/lib/export-excel';
import { useAuth } from '@/lib/auth-provider';

type AssetType = 'MACHINE' | 'VEHICLE';
type AssetStatus = 'ACTIVE' | 'MAINTENANCE' | 'BROKEN' | 'INACTIVE';
type MaintenanceType = 'ROUTINE' | 'INSPECTION' | 'INSURANCE' | 'REPAIR';

interface Asset {
  id: string;
  type: AssetType;
  name: string;
  code: string;
  licensePlate: string | null;
  capacityTons: number | null;
  status: AssetStatus;
  notes: string | null;
  maintenanceCount: number;
  nextDue: string | null;
  nextDueType: MaintenanceType | null;
}

interface MaintenanceRecord {
  id: string;
  type: MaintenanceType;
  performedAt: string;
  dueAt: string | null;
  cost: number | null;
  notes: string | null;
}

const statusConfig: Record<AssetStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Đang chạy', className: 'bg-[#a0f399]/40 text-secondary' },
  MAINTENANCE: { label: 'Đang bảo trì', className: 'bg-tertiary-fixed text-tertiary-container' },
  BROKEN: { label: 'Hỏng', className: 'bg-error-container text-error' },
  INACTIVE: { label: 'Ngừng dùng', className: 'bg-container-high text-on-surface-variant' },
};

const maintenanceTypeLabel: Record<MaintenanceType, string> = {
  ROUTINE: 'Bảo dưỡng',
  INSPECTION: 'Đăng kiểm',
  INSURANCE: 'Bảo hiểm',
  REPAIR: 'Sửa chữa',
};

/** Nearest-due color: red ≤7 days, amber ≤30, neutral otherwise. */
function dueClass(due: string | null): string {
  if (!due) return 'text-faint';
  const days = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
  if (days <= 7) return 'text-error';
  if (days <= 30) return 'text-tertiary-container';
  return 'text-secondary';
}

function dueLabel(due: string | null): string {
  if (!due) return '—';
  return new Date(due).toLocaleDateString('vi-VN');
}

/** Today's date on this device as YYYY-MM-DD (toISOString() would give the UTC date). */
function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function AssetsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<AssetType>('MACHINE');

  // add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<AssetType>('MACHINE');
  const [form, setForm] = useState({ name: '', code: '', licensePlate: '', capacityTons: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  // detail drawer
  const [selected, setSelected] = useState<Asset | null>(null);
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // record maintenance modal
  const [showRecord, setShowRecord] = useState(false);
  const [recordForm, setRecordForm] = useState({
    type: 'ROUTINE' as MaintenanceType,
    performedAt: localToday(),
    dueAt: '',
    cost: '',
    notes: '',
  });

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch(ASSET_ENDPOINTS.BASE);
      if (!res.ok) throw new Error('Không thể tải danh sách tài sản');
      const data = unwrapEnvelope<Asset[]>(await res.json());
      setAssets(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const openDetail = async (asset: Asset) => {
    setSelected(asset);
    setHistoryLoading(true);
    try {
      const res = await fetch(ASSET_ENDPOINTS.MAINTENANCE(asset.id));
      if (!res.ok) throw new Error();
      const data = unwrapEnvelope<MaintenanceRecord[]>(await res.json());
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast({ type: 'error', title: 'Thiếu thông tin', message: 'Tên và mã tài sản là bắt buộc' });
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        type: addType,
        name: form.name.trim(),
        code: form.code.trim(),
        notes: form.notes.trim() || undefined,
      };
      if (addType === 'VEHICLE') body.licensePlate = form.licensePlate.trim();
      if (addType === 'MACHINE' && form.capacityTons) body.capacityTons = Number(form.capacityTons);

      const res = await fetch(ASSET_ENDPOINTS.BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Không thể tạo tài sản');
      setShowAdd(false);
      setForm({ name: '', code: '', licensePlate: '', capacityTons: '', notes: '' });
      toast({ type: 'success', title: 'Đã thêm tài sản' });
      fetchAssets();
    } catch (err) {
      toast({
        type: 'error',
        title: 'Thêm tài sản thất bại',
        message: err instanceof Error ? err.message : 'Đã xảy ra lỗi',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (asset: Asset, status: AssetStatus) => {
    try {
      const res = await fetch(ASSET_ENDPOINTS.DETAIL(asset.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Không thể cập nhật trạng thái');
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, status } : a)));
      setSelected((prev) => (prev?.id === asset.id ? { ...prev, status } : prev));
      toast({ type: 'success', title: 'Đã cập nhật trạng thái' });
    } catch (err) {
      toast({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: err instanceof Error ? err.message : 'Đã xảy ra lỗi',
      });
    }
  };

  const handleRecord = async () => {
    if (!selected) return;
    try {
      const res = await fetch(ASSET_ENDPOINTS.MAINTENANCE(selected.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: recordForm.type,
          performedAt: recordForm.performedAt,
          dueAt: recordForm.dueAt || null,
          cost: recordForm.cost ? Number(recordForm.cost) : null,
          notes: recordForm.notes || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Không thể ghi nhận');
      setShowRecord(false);
      setRecordForm({
        type: 'ROUTINE',
        performedAt: localToday(),
        dueAt: '',
        cost: '',
        notes: '',
      });
      toast({ type: 'success', title: 'Đã ghi nhận bảo trì' });
      openDetail(selected);
      fetchAssets();
    } catch (err) {
      toast({
        type: 'error',
        title: 'Ghi nhận thất bại',
        message: err instanceof Error ? err.message : 'Đã xảy ra lỗi',
      });
    }
  };

  const handleCloseDrawer = () => {
    // Esc closes the top layer only: with the record dialog open, it closes the
    // dialog and keeps the asset, so the dialog never outlives its drawer.
    if (showRecord) {
      setShowRecord(false);
      return;
    }
    setSelected(null);
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Xóa tài sản "${asset.name}" cùng toàn bộ lịch sử bảo trì?`)) return;
    try {
      const res = await fetch(ASSET_ENDPOINTS.DETAIL(asset.id), { method: 'DELETE' });
      if (!res.ok) throw new Error('Không thể xóa tài sản');
      setSelected(null);
      toast({ type: 'success', title: 'Đã xóa tài sản' });
      fetchAssets();
    } catch (err) {
      toast({
        type: 'error',
        title: 'Xóa thất bại',
        message: err instanceof Error ? err.message : 'Đã xảy ra lỗi',
      });
    }
  };

  const filtered = assets.filter((a) => a.type === tab);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-primary-accent font-bold">Đang tải tài sản...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-error font-bold">Lỗi: {error}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Tài Sản Xưởng</h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Máy móc & xe tải — theo dõi trạng thái, bảo trì, đăng kiểm và bảo hiểm
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => {
                const headers = ['Loại', 'Tên', 'Mã', 'Biển số', 'Công suất (tấn)', 'Trạng thái', 'Hạn gần nhất', 'Số lần bảo trì'];
                const rows = filtered.map((a) => [
                  a.type === 'MACHINE' ? 'Máy móc' : 'Xe tải',
                  a.name,
                  a.code,
                  a.licensePlate ?? '',
                  a.capacityTons ?? '',
                  statusConfig[a.status].label,
                  dueLabel(a.nextDue),
                  a.maintenanceCount,
                ]);
                exportToCSV('Tai_San_Xuong', headers, rows);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 border border-outline-variant bg-card hover:bg-container-low text-primary-deep font-bold text-xs rounded transition-all shadow-2xs"
            >
              <Download className="h-4 w-4" />
              XUẤT CSV
            </button>
            <button
              onClick={() => { setAddType(tab); setShowAdd(true); }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded bg-primary-container hover:bg-primary text-white font-bold text-xs transition-all shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              THÊM TÀI SẢN
            </button>
          </div>
        </div>

        {/* Type tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab('MACHINE')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all ${
              tab === 'MACHINE' ? 'bg-primary-container text-white shadow-2xs' : 'bg-card border border-outline-variant text-on-surface-variant hover:bg-container-low'
            }`}
          >
            <Wrench className="h-4 w-4" />
            Máy móc ({assets.filter((a) => a.type === 'MACHINE').length})
          </button>
          <button
            onClick={() => setTab('VEHICLE')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all ${
              tab === 'VEHICLE' ? 'bg-primary-container text-white shadow-2xs' : 'bg-card border border-outline-variant text-on-surface-variant hover:bg-container-low'
            }`}
          >
            <Truck className="h-4 w-4" />
            Xe tải ({assets.filter((a) => a.type === 'VEHICLE').length})
          </button>
          <button
            onClick={fetchAssets}
            className="ml-auto p-2 rounded border border-outline-variant bg-card text-on-surface-variant hover:bg-container-low transition-all"
            title="Làm mới"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="rounded border border-outline-variant bg-card p-10 text-center">
            {tab === 'MACHINE' ? <Wrench className="h-10 w-10 text-faint mx-auto mb-3" /> : <Truck className="h-10 w-10 text-faint mx-auto mb-3" />}
            <p className="text-sm font-bold text-on-surface mb-1">
              {tab === 'MACHINE' ? 'Chưa có máy móc nào' : 'Chưa có xe tải nào'}
            </p>
            <p className="text-xs text-on-surface-variant mb-4">Thêm tài sản đầu tiên để theo dõi bảo trì và hạn đăng kiểm</p>
            <button
              onClick={() => { setAddType(tab); setShowAdd(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary-container hover:bg-primary text-white font-bold text-xs transition-all"
            >
              <Plus className="h-4 w-4" />
              THÊM {tab === 'MACHINE' ? 'MÁY MÓC' : 'XE TẢI'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((asset) => (
              <button
                key={asset.id}
                onClick={() => openDetail(asset)}
                className="text-left rounded border border-outline-variant bg-card p-4 shadow-sm hover:shadow-md hover:border-primary-accent/40 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{asset.name}</p>
                    <p className="text-[10px] text-faint font-mono mt-0.5">
                      {asset.code}{asset.licensePlate ? ` • ${asset.licensePlate}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${statusConfig[asset.status].className}`}>
                    {statusConfig[asset.status].label}
                  </span>
                </div>
                {asset.type === 'MACHINE' && asset.capacityTons != null && (
                  <p className="text-xs text-on-surface-variant">Công suất: <span className="font-data font-bold">{asset.capacityTons}</span> tấn</p>
                )}
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <CalendarClock className={`h-3.5 w-3.5 ${dueClass(asset.nextDue)}`} />
                  <span className="text-on-surface-variant">
                    {asset.nextDueType ? maintenanceTypeLabel[asset.nextDueType] : 'Hạn tiếp theo'}:
                  </span>
                  <span className={`font-bold ${dueClass(asset.nextDue)}`}>{dueLabel(asset.nextDue)}</span>
                </div>
                <p className="text-[10px] text-faint mt-1">{asset.maintenanceCount} lần bảo trì đã ghi nhận</p>
              </button>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAdd && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40" onClick={() => setShowAdd(false)} />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Thêm tài sản"
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-outline-variant rounded shadow-xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-bold text-on-surface mb-1">Thêm tài sản</h3>
              <p className="text-xs text-on-surface-variant mb-5">Máy móc hoặc xe tải của xưởng</p>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setAddType('MACHINE')}
                  className={`flex-1 py-2 rounded text-xs font-bold transition-all ${addType === 'MACHINE' ? 'bg-primary-container text-white' : 'border border-outline-variant text-on-surface-variant'}`}
                >
                  Máy móc
                </button>
                <button
                  onClick={() => setAddType('VEHICLE')}
                  className={`flex-1 py-2 rounded text-xs font-bold transition-all ${addType === 'VEHICLE' ? 'bg-primary-container text-white' : 'border border-outline-variant text-on-surface-variant'}`}
                >
                  Xe tải
                </button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Tên tài sản *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-primary-accent focus:outline-none focus:ring-1 focus:ring-primary-accent"
                    placeholder={addType === 'MACHINE' ? 'Máy Ống 30 Tấn' : 'Xe tải Hino 5 tấn'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Mã tài sản *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-card border border-outline-variant rounded text-sm text-on-surface font-mono focus:border-primary-accent focus:outline-none focus:ring-1 focus:ring-primary-accent"
                    placeholder={addType === 'MACHINE' ? 'M01' : 'X01'}
                  />
                </div>
                {addType === 'VEHICLE' ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Biển số xe *</label>
                    <input
                      type="text"
                      value={form.licensePlate}
                      onChange={(e) => setForm((p) => ({ ...p, licensePlate: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-card border border-outline-variant rounded text-sm text-on-surface font-mono uppercase focus:border-primary-accent focus:outline-none focus:ring-1 focus:ring-primary-accent"
                      placeholder="51C-123.45"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Công suất (tấn/ngày)</label>
                    <input
                      type="number"
                      value={form.capacityTons}
                      onChange={(e) => setForm((p) => ({ ...p, capacityTons: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-card border border-outline-variant rounded text-sm text-on-surface font-data focus:border-primary-accent focus:outline-none focus:ring-1 focus:ring-primary-accent"
                      placeholder="30"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Ghi chú</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-primary-accent focus:outline-none focus:ring-1 focus:ring-primary-accent"
                    placeholder="Năm sản xuất, model..."
                  />
                </div>
              </div>

              <div className="flex gap-2.5 mt-5">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded border border-outline-variant text-xs font-bold text-on-surface-variant hover:bg-container-low">
                  HỦY
                </button>
                <button
                  onClick={handleAdd}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded bg-primary-container hover:bg-primary text-white text-xs font-bold disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'XÁC NHẬN'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Detail Drawer */}
        <Drawer isOpen={!!selected} onClose={handleCloseDrawer} title={selected ? `Tài sản: ${selected.name}` : ''}>
          {selected && (
            <div className="space-y-5">
              <div className="rounded border border-outline-soft bg-surface p-3.5">
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <p className="text-faint">Mã</p>
                    <p className="font-bold text-on-surface font-mono">{selected.code}</p>
                  </div>
                  <div>
                    <p className="text-faint">Trạng thái</p>
                    <select
                      value={selected.status}
                      onChange={(e) => handleStatusChange(selected, e.target.value as AssetStatus)}
                      className={`mt-0.5 rounded px-2 py-1 text-xs font-bold border-0 cursor-pointer ${statusConfig[selected.status].className}`}
                    >
                      {(Object.keys(statusConfig) as AssetStatus[]).map((s) => (
                        <option key={s} value={s}>{statusConfig[s].label}</option>
                      ))}
                    </select>
                  </div>
                  {selected.licensePlate && (
                    <div>
                      <p className="text-faint">Biển số</p>
                      <p className="font-bold text-on-surface font-mono">{selected.licensePlate}</p>
                    </div>
                  )}
                  {selected.capacityTons != null && (
                    <div>
                      <p className="text-faint">Công suất</p>
                      <p className="font-bold text-on-surface font-data">{selected.capacityTons} tấn</p>
                    </div>
                  )}
                  <div>
                    <p className="text-faint">Hạn gần nhất</p>
                    <p className={`font-bold ${dueClass(selected.nextDue)}`}>
                      {selected.nextDueType ? maintenanceTypeLabel[selected.nextDueType] : '—'} · {dueLabel(selected.nextDue)}
                    </p>
                  </div>
                </div>
                {selected.notes && <p className="text-xs text-on-surface-variant mt-2 border-t border-outline-soft pt-2">{selected.notes}</p>}
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(selected)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded border border-outline-variant text-error text-xs font-bold hover:bg-error-container transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                    XÓA TÀI SẢN
                  </button>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Lịch sử bảo trì</h4>
                  <button
                    onClick={() => setShowRecord(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-primary-container hover:bg-primary text-white text-[10px] font-bold transition-all"
                  >
                    <Pencil className="h-3 w-3" />
                    GHI NHẬN
                  </button>
                </div>

                {historyLoading ? (
                  <p className="text-xs text-faint text-center py-4">Đang tải...</p>
                ) : history.length === 0 ? (
                  <p className="text-xs text-faint text-center py-4 border border-dashed border-outline-variant rounded">
                    Chưa có lịch sử — nhấn GHI NHẬN để thêm lần bảo trì/đăng kiểm đầu tiên
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.map((rec) => (
                      <div key={rec.id} className="rounded border border-outline-soft bg-surface p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-on-surface">{maintenanceTypeLabel[rec.type]}</span>
                          {rec.cost != null && (
                            <span className="text-xs font-data font-bold text-primary-accent">{rec.cost.toLocaleString('vi-VN')}đ</span>
                          )}
                        </div>
                        <p className="text-[10px] text-on-surface-variant mt-1">
                          Thực hiện: {new Date(rec.performedAt).toLocaleDateString('vi-VN')}
                          {rec.dueAt && <> · Hạn tiếp: <span className={dueClass(rec.dueAt)}>{new Date(rec.dueAt).toLocaleDateString('vi-VN')}</span></>}
                        </p>
                        {rec.notes && <p className="text-[10px] text-faint mt-1">{rec.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Drawer>

        {/* Record Maintenance Modal */}
        {showRecord && selected && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40" onClick={() => setShowRecord(false)} />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Ghi nhận bảo trì"
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-outline-variant rounded shadow-xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-base font-bold text-on-surface mb-1">Ghi nhận — {selected.name}</h3>
              <p className="text-xs text-on-surface-variant mb-4">Bảo dưỡng, đăng kiểm, bảo hiểm hoặc sửa chữa</p>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Loại *</label>
                  <select
                    value={recordForm.type}
                    onChange={(e) => setRecordForm((p) => ({ ...p, type: e.target.value as MaintenanceType }))}
                    className="w-full px-3 py-2.5 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-primary-accent focus:outline-none"
                  >
                    <option value="ROUTINE">Bảo dưỡng</option>
                    <option value="INSPECTION">Đăng kiểm</option>
                    <option value="INSURANCE">Bảo hiểm</option>
                    <option value="REPAIR">Sửa chữa</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Ngày thực hiện *</label>
                    <DatePicker
                      value={recordForm.performedAt}
                      onChange={(value) => setRecordForm((p) => ({ ...p, performedAt: value }))}
                      ariaLabel="Ngày thực hiện"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Hạn tiếp theo</label>
                    <DatePicker
                      value={recordForm.dueAt}
                      onChange={(value) => setRecordForm((p) => ({ ...p, dueAt: value }))}
                      placeholder="Không có"
                      ariaLabel="Hạn tiếp theo"
                      align="right"
                      clearable
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Chi phí (VND)</label>
                  <input
                    type="number"
                    value={recordForm.cost}
                    onChange={(e) => setRecordForm((p) => ({ ...p, cost: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-card border border-outline-variant rounded text-sm text-on-surface font-data focus:border-primary-accent focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Ghi chú</label>
                  <textarea
                    value={recordForm.notes}
                    onChange={(e) => setRecordForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2.5 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-primary-accent focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 mt-5">
                <button onClick={() => setShowRecord(false)} className="flex-1 py-2.5 rounded border border-outline-variant text-xs font-bold text-on-surface-variant hover:bg-container-low">
                  HỦY
                </button>
                <button
                  onClick={handleRecord}
                  className="flex-1 py-2.5 rounded bg-primary-container hover:bg-primary text-white text-xs font-bold"
                >
                  GHI NHẬN
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
