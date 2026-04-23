'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/dashboard/sidebar';
import { User, Bell, Database, Shield, Palette, Save, Users, Key, Plus, X, CreditCard } from 'lucide-react';

type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'DRIVER';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  // New staff form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('STAFF');

  const isAdmin = currentUser?.role === 'ADMIN';
  const canViewBilling = currentUser?.role === 'ADMIN' || currentUser?.role === 'ACCOUNTANT';

  // Fetch current user and staff list
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) setCurrentUser(data.user);
      } catch (err) {
        console.error('Failed to load user', err);
      }
    }
    loadUser();
  }, []);

  // Fetch staff list when admin
  useEffect(() => {
    if (!isAdmin) return;
    async function loadStaff() {
      try {
        const res = await fetch('/api/staff');
        const data = await res.json();
        if (data.users) setStaffUsers(data.users);
      } catch (err) {
        console.error('Failed to load staff', err);
      }
    }
    loadStaff();
  }, [isAdmin]);

  const tabs = [
    { id: 'profile', label: 'Hồ sơ', icon: User },
    { id: 'notifications', label: 'Thông báo', icon: Bell },
    { id: 'products', label: 'Sản phẩm', icon: Database },
    { id: 'security', label: 'Bảo mật', icon: Shield },
    { id: 'appearance', label: 'Giao diện', icon: Palette },
    ...(isAdmin ? [{ id: 'staff', label: 'Nhân sự', icon: Users }] : []),
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
                {canViewBilling && (
                  <Link
                    href="/settings/billing"
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-slate-400 transition-all hover:bg-white/5 hover:text-white"
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-sm font-medium">Thanh toán</span>
                  </Link>
                )}
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

              {activeTab === 'staff' && (
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white">Quản lý nhân sự</h2>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Thêm nhân sự
                    </button>
                  </div>

                  {/* Staff Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="py-3 px-4 text-sm font-semibold text-slate-400">Họ tên</th>
                          <th className="py-3 px-4 text-sm font-semibold text-slate-400">Vai trò</th>
                          <th className="py-3 px-4 text-sm font-semibold text-slate-400">Email</th>
                          <th className="py-3 px-4 text-sm font-semibold text-slate-400">Trạng thái</th>
                          <th className="py-3 px-4 text-sm font-semibold text-slate-400 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffUsers.map((staff) => (
                          <tr key={staff.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-3 px-4 text-white font-medium">{staff.name}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                staff.role === 'ADMIN'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : staff.role === 'ACCOUNTANT'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : staff.role === 'DRIVER'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {staff.role === 'ADMIN' ? 'Admin' : staff.role === 'ACCOUNTANT' ? 'Kế toán' : staff.role === 'DRIVER' ? 'Tài xế' : 'Nhân viên'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-sm">{staff.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                staff.isActive
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {staff.isActive ? 'Hoạt động' : 'Khóa'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setShowPasswordModal(staff.id)}
                                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-colors"
                                  title="Đổi mật khẩu"
                                >
                                  <Key className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await fetch(`/api/staff/${staff.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ isActive: !staff.isActive }),
                                      });
                                      setStaffUsers(prev =>
                                        prev.map(s => s.id === staff.id ? { ...s, isActive: !s.isActive } : s)
                                      );
                                    } catch (err) {
                                      console.error('Failed to toggle active', err);
                                    }
                                  }}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                    staff.isActive
                                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                      : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                  }`}
                                >
                                  {staff.isActive ? 'Khóa' : 'Mở khóa'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {staffUsers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500">
                              Chưa có nhân sự nào
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Create Staff Modal */}
              {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 w-full max-w-md">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-white">Thêm nhân sự</h3>
                      <button
                        onClick={() => {
                          setShowCreateModal(false);
                          setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('STAFF');
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Họ tên</label>
                        <input
                          type="text"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                          placeholder="VD: Nguyễn Văn A"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                          placeholder="VD: nv-a@email.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Mật khẩu</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                          placeholder="Ít nhất 6 ký tự"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Vai trò</label>
                        <select
                          value={newRole}
                          onChange={e => setNewRole(e.target.value as UserRole)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                        >
                          <option value="STAFF">Nhân viên</option>
                          <option value="DRIVER">Tài xế</option>
                          <option value="ACCOUNTANT">Kế toán</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>
                      <button
                        onClick={async () => {
                          if (!newName || !newEmail || !newPassword) return;
                          try {
                            const res = await fetch('/api/staff', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole }),
                            });
                            const data = await res.json();
                            if (data.user) {
                              setStaffUsers(prev => [data.user, ...prev]);
                              setShowCreateModal(false);
                              setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('STAFF');
                            }
                          } catch (err) {
                            console.error('Failed to create staff', err);
                          }
                        }}
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                      >
                        Tạo nhân sự
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Change Password Modal */}
              {showPasswordModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 w-full max-w-md">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-white">Đổi mật khẩu</h3>
                      <button
                        onClick={() => { setShowPasswordModal(null); setPasswordInput(''); }}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Mật khẩu mới</label>
                        <input
                          type="password"
                          value={passwordInput}
                          onChange={e => setPasswordInput(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
                          placeholder="Ít nhất 6 ký tự"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          if (!passwordInput || passwordInput.length < 6) return;
                          try {
                            await fetch(`/api/staff/${showPasswordModal}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ password: passwordInput }),
                            });
                            setShowPasswordModal(null);
                            setPasswordInput('');
                          } catch (err) {
                            console.error('Failed to reset password', err);
                          }
                        }}
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                      >
                        Lưu mật khẩu
                      </button>
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
