'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Settings, User, Bell, Database, Shield, Palette, Save } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Hồ sơ', icon: User },
    { id: 'notifications', label: 'Thông báo', icon: Bell },
    { id: 'products', label: 'Sản phẩm', icon: Database },
    { id: 'security', label: 'Bảo mật', icon: Shield },
    { id: 'appearance', label: 'Giao diện', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-violet-600/10 rounded-full blur-3xl" />
      </div>

      <Sidebar />

      <main className="pl-64">
        <div className="relative p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white">Cài đặt</h1>
            <p className="text-slate-400 mt-1">Quản lý tài khoản và hệ thống</p>
          </div>

          <div className="flex gap-8">
            {/* Tabs Sidebar */}
            <div className="w-64 shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
              {activeTab === 'profile' && (
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-6">Hồ sơ nhà máy</h2>

                  <div className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Tên nhà máy</label>
                      <input
                        type="text"
                        defaultValue="Nhà máy đá ABC"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                      <input
                        type="email"
                        defaultValue="contact@abcice.vn"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Số điện thoại</label>
                      <input
                        type="tel"
                        defaultValue="0909123456"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Địa chỉ</label>
                      <input
                        type="text"
                        defaultValue="123 Đường ABC, Quận XYZ, TP.HCM"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors mt-4">
                      <Save className="h-5 w-5" />
                      Lưu thay đổi
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-6">Thông báo</h2>
                  <div className="space-y-4">
                    {[
                      { label: 'Thông báo đơn hàng mới', desc: 'Khi có đơn hàng được tạo', enabled: true },
                      { label: 'Nhắc nhở công nợ', desc: 'Khi khách nợ quá hạn', enabled: true },
                      { label: 'Cảnh báo tồn kho', desc: 'Khi kho xuống dưới định mức', enabled: false },
                      { label: 'Báo cáo hàng ngày', desc: 'Gửi email tổng kết ngày', enabled: false },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div>
                          <p className="text-white font-medium">{item.label}</p>
                          <p className="text-sm text-slate-400">{item.desc}</p>
                        </div>
                        <button
                          className={`w-12 h-6 rounded-full transition-colors relative ${
                            item.enabled ? 'bg-blue-500' : 'bg-slate-600'
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              item.enabled ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'products' && (
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-6">Quản lý sản phẩm</h2>
                  <p className="text-slate-400">Danh sách sản phẩm và giá mặc định</p>
                  <div className="mt-4 space-y-3">
                    {[
                      { name: 'Đá Bi', size: 5, price: 12000 },
                      { name: 'Đá Bi', size: 10, price: 22000 },
                      { name: 'Đá Bi', size: 20, price: 40000 },
                      { name: 'Đá Viên', size: 5, price: 14000 },
                      { name: 'Đá Viên', size: 10, price: 26000 },
                      { name: 'Đá Viên', size: 20, price: 48000 },
                    ].map((p, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <span className="text-white">{p.name} {p.size}kg</span>
                        <span className="text-emerald-400 font-semibold">{p.price.toLocaleString('vi-VN')}đ</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-6">Bảo mật</h2>
                  <div className="space-y-6 max-w-lg">
                    <div>
                      <h3 className="text-white font-medium mb-2">Đổi mật khẩu</h3>
                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="Mật khẩu hiện tại"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50"
                        />
                        <input
                          type="password"
                          placeholder="Mật khẩu mới"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50"
                        />
                        <input
                          type="password"
                          placeholder="Xác nhận mật khẩu mới"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50"
                        />
                        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                          Cập nhật mật khẩu
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-6">Giao diện</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-white font-medium mb-3">Chế độ màu</p>
                      <div className="flex gap-3">
                        <button className="px-4 py-2 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-xl text-sm font-medium">
                          Tối (Hiện tại)
                        </button>
                        <button className="px-4 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm font-medium hover:text-white">
                          Sáng
                        </button>
                        <button className="px-4 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-sm font-medium hover:text-white">
                          Tự động
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
