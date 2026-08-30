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
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d]">
      <Sidebar />

      <main className="pl-64">
        <div className="p-8 max-w-[1400px]">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c2c6d3] pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">Kho Lạnh & Tồn Kho</h1>
              <p className="text-xs text-[#424751] mt-1">Theo dõi tồn kho theo loại đá và nhật ký sản xuất</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              NHẬP SẢN LƯỢNG MỚI
            </button>
          </div>

          {/* Inventory Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Đá Bi */}
            <div className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-[#e7eeff] pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-[#004a99] flex items-center justify-center text-white">
                    <Snowflake className="h-5 w-5 text-[#9bbdff]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#111c2d]">Đá Bi (Túi/Bao)</h3>
                    <p className="text-xs text-[#737783]">Đá uống bia, cà phê</p>
                  </div>
                </div>
                <p className="data-lg font-bold text-[#004a99]">{fakeInventory.daBi.totalKg.toLocaleString()} kg</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#f9f9ff] border border-[#e7eeff] rounded p-3 text-center">
                  <p className="text-[#424751] text-xs font-bold mb-1">Bao 5kg</p>
                  <p className="data-md font-bold text-[#111c2d]">{fakeInventory.daBi.bags5}</p>
                </div>
                <div className="bg-[#f9f9ff] border border-[#e7eeff] rounded p-3 text-center">
                  <p className="text-[#424751] text-xs font-bold mb-1">Bao 10kg</p>
                  <p className="data-md font-bold text-[#111c2d]">{fakeInventory.daBi.bags10}</p>
                </div>
                <div className="bg-[#f9f9ff] border border-[#e7eeff] rounded p-3 text-center">
                  <p className="text-[#424751] text-xs font-bold mb-1">Bao 20kg</p>
                  <p className="data-md font-bold text-[#111c2d]">{fakeInventory.daBi.bags20}</p>
                </div>
              </div>
            </div>

            {/* Đá Viên */}
            <div className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-[#e7eeff] pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-[#004a99] flex items-center justify-center text-white">
                    <Snowflake className="h-5 w-5 text-[#9bbdff]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#111c2d]">Đá Viên / Đá Cây</h3>
                    <p className="text-xs text-[#737783]">Đá ướp thực phẩm, hải sản</p>
                  </div>
                </div>
                <p className="data-lg font-bold text-[#004a99]">{fakeInventory.daVien.totalKg.toLocaleString()} kg</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#f9f9ff] border border-[#e7eeff] rounded p-3 text-center">
                  <p className="text-[#424751] text-xs font-bold mb-1">Bao 5kg</p>
                  <p className="data-md font-bold text-[#111c2d]">{fakeInventory.daVien.bags5}</p>
                </div>
                <div className="bg-[#f9f9ff] border border-[#e7eeff] rounded p-3 text-center">
                  <p className="text-[#424751] text-xs font-bold mb-1">Bao 10kg</p>
                  <p className="data-md font-bold text-[#111c2d]">{fakeInventory.daVien.bags10}</p>
                </div>
                <div className="bg-[#f9f9ff] border border-[#e7eeff] rounded p-3 text-center">
                  <p className="text-[#424751] text-xs font-bold mb-1">Bao 20kg</p>
                  <p className="data-md font-bold text-[#111c2d]">{fakeInventory.daVien.bags20}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Production History */}
          <div className="rounded border border-[#c2c6d3] bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#c2c6d3] bg-[#f9f9ff]">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#004a99]" />
                <h3 className="text-sm font-bold text-[#111c2d]">Nhật Ký Cắt & Nhập Kho Hôm Nay</h3>
              </div>
              <span className="text-xs font-bold text-[#004a99] bg-[#dee8ff] px-2.5 py-1 rounded">
                Tổng nhập: {todayTotal} bao
              </span>
            </div>

            <table className="w-full text-left border-collapse table-industrial">
              <thead>
                <tr className="border-b border-[#c2c6d3] bg-[#f9f9ff] text-[12px] font-bold uppercase tracking-wider text-[#424751]">
                  <th className="py-3 px-4">Giờ</th>
                  <th className="py-3 px-4">Loại đá</th>
                  <th className="py-3 px-4">Quy cách</th>
                  <th className="py-3 px-4 text-right">Số lượng (Bao)</th>
                  <th className="py-3 px-4 text-right">Người nhập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7eeff] text-sm">
                {fakeProductionLogs.map((log) => (
                  <tr key={log.id} className="h-11 hover:bg-[#f0f3ff] transition-colors">
                    <td className="py-3 px-4 data-sm font-bold text-[#737783]">{log.time}</td>
                    <td className="py-3 px-4 font-bold text-[#111c2d]">{log.type}</td>
                    <td className="py-3 px-4 text-xs font-mono text-[#004a99]">{log.size}</td>
                    <td className="py-3 px-4 text-right data-md font-bold text-[#111c2d]">+{log.quantity}</td>
                    <td className="py-3 px-4 text-right text-xs text-[#424751] font-medium">{log.worker}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Production Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white border border-[#c2c6d3] rounded shadow-xl p-6">
            <h3 className="text-lg font-bold text-[#111c2d] mb-1">Nhập sản lượng kho</h3>
            <p className="text-[#424751] text-xs mb-5">Ghi nhận mẻ đá vừa ra lò vào kho lạnh</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#424751] mb-1.5">Loại đá & Quy cách</label>
                <select
                  value={selectedType.id}
                  onChange={(e) => {
                    const t = inventoryTypes.find(item => item.id === e.target.value);
                    if (t) setSelectedType(t);
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#c2c6d3] rounded text-sm text-[#111c2d] focus:border-[#004a99]"
                >
                  {inventoryTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#424751] mb-1.5">Số lượng (Bao)</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ví dụ: 50"
                  className="w-full px-3 py-2 bg-white border border-[#c2c6d3] rounded text-sm text-[#111c2d] focus:border-[#004a99]"
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-[#c2c6d3] text-[#424751] font-bold text-xs rounded hover:bg-[#dee8ff] transition-colors"
              >
                HỦY
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors shadow-sm"
              >
                XÁC NHẬN NHẬP KHO
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
