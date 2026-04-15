'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Snowflake, Plus, History, TrendingUp, Package } from 'lucide-react';

// Fake inventory data
const fakeInventory = {
  daBi: { totalKg: 2500, bags5: 200, bags10: 150, bags20: 50 },
  daVien: { totalKg: 1800, bags5: 150, bags10: 120, bags20: 30 },
};

const fakeProductionLogs = [
  { id: 1, time: '06:00', type: 'Đá Bi', size: '10kg', quantity: 30, worker: 'Anh Minh' },
  { id: 2, time: '08:30', type: 'Đá Viên', size: '5kg', quantity: 25, worker: 'Anh Minh' },
  { id: 3, time: '10:15', type: 'Đá Bi', size: '20kg', quantity: 20, worker: 'Chị Hương' },
  { id: 4, time: '13:00', type: 'Đá Bi', size: '5kg', quantity: 40, worker: 'Chị Hương' },
  { id: 5, time: '15:45', type: 'Đá Viên', size: '10kg', quantity: 35, worker: 'Anh Vinh' },
];

const inventoryTypes = [
  { id: 'daBi5', label: 'Đá Bi 5kg', type: 'Đá Bi', size: 5 },
  { id: 'daBi10', label: 'Đá Bi 10kg', type: 'Đá Bi', size: 10 },
  { id: 'daBi20', label: 'Đá Bi 20kg', type: 'Đá Bi', size: 20 },
  { id: 'daVien5', label: 'Đá Viên 5kg', type: 'Đá Viên', size: 5 },
  { id: 'daVien10', label: 'Đá Viên 10kg', type: 'Đá Viên', size: 10 },
  { id: 'daVien20', label: 'Đá Viên 20kg', type: 'Đá Viên', size: 20 },
];

export default function InventoryPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState(inventoryTypes[0]);
  const [quantity, setQuantity] = useState('');

  const todayTotal = fakeProductionLogs.reduce((sum, log) => sum + log.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-cyan-600/10 to-blue-600/10 rounded-full blur-3xl" />
      </div>

      <Sidebar />

      <main className="pl-64">
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">Kho lạnh</h1>
              <p className="text-slate-400 mt-1">Theo dõi tồn kho và sản lượng</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
            >
              <Plus className="h-5 w-5" />
              Nhập sản lượng
            </button>
          </div>

          {/* Inventory Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Đá Bi */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 backdrop-blur-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Snowflake className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Đá Bi</h3>
                  <p className="text-cyan-400 text-2xl font-black">{fakeInventory.daBi.totalKg.toLocaleString()} kg</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">Bao 5kg</p>
                  <p className="text-lg font-bold text-white">{fakeInventory.daBi.bags5}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">Bao 10kg</p>
                  <p className="text-lg font-bold text-white">{fakeInventory.daBi.bags10}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">Bao 20kg</p>
                  <p className="text-lg font-bold text-white">{fakeInventory.daBi.bags20}</p>
                </div>
              </div>
            </div>

            {/* Đá Viên */}
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-violet-500/5 backdrop-blur-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Snowflake className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Đá Viên</h3>
                  <p className="text-blue-400 text-2xl font-black">{fakeInventory.daVien.totalKg.toLocaleString()} kg</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">Bao 5kg</p>
                  <p className="text-lg font-bold text-white">{fakeInventory.daVien.bags5}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">Bao 10kg</p>
                  <p className="text-lg font-bold text-white">{fakeInventory.daVien.bags10}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">Bao 20kg</p>
                  <p className="text-lg font-bold text-white">{fakeInventory.daVien.bags20}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Production */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-slate-400" />
                <h3 className="text-lg font-bold text-white">Sản lượng hôm nay</h3>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">{todayTotal} bao</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Giờ</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Loại</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Qui cách</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Số lượng</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Công nhân</th>
                  </tr>
                </thead>
                <tbody>
                  {fakeProductionLogs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-white font-mono">{log.time}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.type === 'Đá Bi' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{log.size}</td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-slate-500" />
                          <span className="text-white font-semibold">{log.quantity}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{log.worker}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Add Production Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Nhập sản lượng</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Loại đá</label>
                <div className="grid grid-cols-2 gap-2">
                  {inventoryTypes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedType(t)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        selectedType.id === t.id
                          ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                          : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Số lượng bao</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-lg focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 border border-white/20 text-slate-400 font-semibold rounded-xl hover:bg-white/5 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setQuantity('');
                }}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-xl transition-colors"
              >
                Nhập kho
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
