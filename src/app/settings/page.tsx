'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { User, Bell, Database, Shield, Palette, Save, Users, Key, Plus, X, CreditCard, LogOut } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { useAuth } from '@/lib/auth-provider';
import { useTheme } from '@/lib/theme';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

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
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const { theme, setTheme } = useTheme();

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
        const res = await fetch(API_ENDPOINTS.AUTH.ME);
        const json = await res.json();
        const data = json?.data !== undefined ? json.data : json;
        if (data?.user) setCurrentUser(data.user);
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
        const res = await fetch(API_ENDPOINTS.STAFF.BASE);
        const json = await res.json();
        const data = json?.data !== undefined ? json.data : json;
        if (data?.users) setStaffUsers(data.users);
      } catch (err) {
        console.error('Failed to load staff', err);
      }
    }
    loadStaff();
  }, [isAdmin]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
  };

  const tabs = [
    { id: 'profile', label: 'Hồ sơ xưởng', icon: User },
    { id: 'notifications', label: 'Thông báo', icon: Bell },
    { id: 'products', label: 'Sản phẩm mẫu', icon: Database },
    { id: 'security', label: 'Bảo mật', icon: Shield },
    { id: 'appearance', label: 'Giao diện', icon: Palette },
    ...(isAdmin ? [{ id: 'staff', label: 'Nhân sự', icon: Users }] : []),
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Cài Đặt Hệ Thống</h1>
            <p className="text-xs text-on-surface-variant mt-1">Quản lý hồ sơ nhà máy, nhân sự, bảng giá và phân quyền</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-error-container hover:bg-[#ffb4ab] text-error font-bold text-xs transition-colors shadow-2xs self-start sm:self-auto"
          >
            <LogOut className="h-4 w-4" />
            <span>{signingOut ? 'Đang đăng xuất...' : 'ĐĂNG XUẤT TÀI KHOẢN'}</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Tabs Sidebar */}
          <div className="w-full md:w-56 shrink-0">
            <nav className="space-y-1 bg-card p-2 rounded border border-outline-variant shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-left text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#004a99] text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-container-high hover:text-primary-deep'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
              {canViewBilling && (
                <Link
                  href="/settings/billing"
                  className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-xs font-bold text-on-surface-variant transition-all hover:bg-container-high hover:text-primary-deep"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Gói Dịch Vụ</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="rounded border border-outline-variant bg-card p-6 shadow-sm">
                <h2 className="text-base font-bold text-on-surface mb-4 border-b border-outline-soft pb-2">Hồ sơ nhà máy</h2>

                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Tên nhà máy</label>
                    <input
                      type="text"
                      defaultValue="Nhà Máy Nước Đá Miền Đông"
                      className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Email liên hệ</label>
                    <input
                      type="email"
                      defaultValue="admin@miendong.vn"
                      className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Số điện thoại tổng đài</label>
                    <input
                      type="tel"
                      defaultValue="0901234567"
                      className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Địa chỉ xưởng đá</label>
                    <input
                      type="text"
                      defaultValue="128 Quốc lộ 1A, TP. Biên Hòa, Đồng Nai"
                      className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99] focus:outline-none"
                    />
                  </div>

                  <button className="flex items-center gap-2 px-4 py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors shadow-sm mt-2">
                    <Save className="h-4 w-4" />
                    LƯU THAY ĐỔI
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="rounded border border-outline-variant bg-card p-6 shadow-sm">
                <h2 className="text-base font-bold text-on-surface mb-4 border-b border-outline-soft pb-2">Thông báo hệ thống</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Thông báo đơn hàng mới', desc: 'Khi có đơn hàng được tạo', enabled: true },
                    { label: 'Nhắc nhở công nợ', desc: 'Khi khách nợ quá hạn', enabled: true },
                    { label: 'Cảnh báo tồn kho', desc: 'Khi kho xuống dưới định mức', enabled: false },
                    { label: 'Báo cáo hàng ngày', desc: 'Gửi email tổng kết ngày', enabled: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-outline-soft last:border-0">
                      <div>
                        <p className="text-sm font-bold text-on-surface">{item.label}</p>
                        <p className="text-xs text-faint">{item.desc}</p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-container-high text-primary-accent">
                        {item.enabled ? 'Đang bật' : 'Đang tắt'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="rounded border border-outline-variant bg-card p-6 shadow-sm">
                <h2 className="text-base font-bold text-on-surface mb-4 border-b border-outline-soft pb-2">Quản lý sản phẩm & Quy cách</h2>
                <p className="text-xs text-faint mb-4">Danh sách phân loại sản phẩm nước đá tiêu chuẩn</p>
                <div className="space-y-2.5">
                  {[
                    { name: 'Đá Bi', size: 5, price: 12000 },
                    { name: 'Đá Bi', size: 10, price: 22000 },
                    { name: 'Đá Bi', size: 20, price: 40000 },
                    { name: 'Đá Viên', size: 5, price: 14000 },
                    { name: 'Đá Viên', size: 10, price: 26000 },
                    { name: 'Đá Viên', size: 20, price: 48000 },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded bg-surface border border-outline-soft text-xs">
                      <span className="font-bold text-on-surface">{p.name} {p.size}kg</span>
                      <span className="text-secondary font-mono font-bold">{p.price.toLocaleString('vi-VN')} đ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="rounded border border-outline-variant bg-card p-6 shadow-sm">
                <h2 className="text-base font-bold text-on-surface mb-4 border-b border-outline-soft pb-2">Bảo mật tài khoản</h2>
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      placeholder="Mật khẩu hiện tại"
                      className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Mật khẩu mới</label>
                    <input
                      type="password"
                      placeholder="Ít nhất 6 ký tự"
                      className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99] outline-none"
                    />
                  </div>
                  <button className="px-4 py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors shadow-sm mt-2">
                    CẬP NHẬT MẬT KHẨU
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="rounded border border-outline-variant bg-card p-6 shadow-sm">
                <h2 className="text-base font-bold text-on-surface mb-4 border-b border-outline-soft pb-2">Giao diện hệ thống</h2>
                <div className="space-y-3">
                  <p className="text-xs text-on-surface-variant">Chọn chế độ màu hiển thị:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-lg">
                    {(
                      [
                        { id: 'light', label: 'Sáng Công Nghiệp', desc: 'Mặc định cho nhà máy' },
                        { id: 'dark', label: 'Tối', desc: 'Dễ mắt khi ca đêm' },
                        { id: 'system', label: 'Theo hệ điều hành', desc: 'Tự động đổi theo máy' },
                      ] as const
                    ).map((opt) => {
                      const active = theme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setTheme(opt.id)}
                          className={`text-left rounded p-3 border transition-all ${
                            active
                              ? 'border-primary-accent bg-container-high shadow-2xs'
                              : 'border-outline-variant bg-card hover:bg-container-low'
                          }`}
                        >
                          <p className={`text-xs font-bold ${active ? 'text-primary-accent' : 'text-on-surface'}`}>
                            {active ? '✓ ' : ''}{opt.label}
                          </p>
                          <p className="text-[10px] text-faint mt-0.5">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'staff' && (
              <div className="rounded border border-outline-variant bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-outline-soft pb-3">
                  <h2 className="text-base font-bold text-on-surface">Quản lý nhân sự</h2>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-[#004a99] hover:bg-[#00346f] text-white text-xs font-bold rounded transition-colors shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    THÊM NHÂN SỰ
                  </button>
                </div>

                {/* Staff Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left table-industrial">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                        <th className="py-3 px-4">Họ tên</th>
                        <th className="py-3 px-4">Vai trò</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-soft text-xs">
                      {staffUsers.map((staff) => (
                        <tr key={staff.id} className="hover:bg-container-low transition-colors">
                          <td className="py-3 px-4 font-bold text-on-surface">{staff.name}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded font-bold bg-container-high text-primary-accent">
                              {staff.role === 'ADMIN' ? 'Quản lý' : staff.role === 'ACCOUNTANT' ? 'Kế toán' : staff.role === 'DRIVER' ? 'Tài xế' : 'Nhân viên'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-faint font-mono">{staff.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              staff.isActive
                                ? 'bg-[#a0f399]/40 text-secondary'
                                : 'bg-error-container text-error'
                            }`}>
                              {staff.isActive ? 'Hoạt động' : 'Đã khóa'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setShowPasswordModal(staff.id)}
                                className="p-1.5 text-on-surface-variant hover:text-primary-accent hover:bg-container-high rounded transition-colors"
                                title="Đổi mật khẩu"
                              >
                                <Key className="h-4 w-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(API_ENDPOINTS.STAFF.DETAIL(staff.id), {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ isActive: !staff.isActive }),
                                    });
                                    if (!res.ok) throw new Error('Không thể cập nhật trạng thái nhân sự');
                                    setStaffUsers(prev =>
                                      prev.map(s => s.id === staff.id ? { ...s, isActive: !s.isActive } : s)
                                    );
                                    toast({
                                      type: 'success',
                                      title: staff.isActive ? 'Đã khóa nhân sự' : 'Đã mở khóa nhân sự',
                                    });
                                  } catch (err) {
                                    console.error('Failed to toggle active', err);
                                    toast({
                                      type: 'error',
                                      title: 'Thao tác thất bại',
                                      message: err instanceof Error ? err.message : 'Không thể cập nhật trạng thái nhân sự',
                                    });
                                  }
                                }}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                                  staff.isActive
                                    ? 'bg-error-container text-error hover:bg-[#ffb4ab]'
                                    : 'bg-[#a0f399]/40 text-secondary hover:bg-[#a0f399]'
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
                          <td colSpan={5} className="py-8 text-center text-faint">
                            Chưa có nhân sự nào được thêm
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
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <div className="rounded border border-outline-variant bg-card p-6 w-full max-w-md shadow-xl">
                  <div className="flex items-center justify-between mb-5 border-b border-outline-soft pb-3">
                    <h3 className="text-base font-bold text-on-surface">Thêm nhân sự mới</h3>
                    <button
                      onClick={() => {
                        setShowCreateModal(false);
                        setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('STAFF');
                      }}
                      className="text-faint hover:text-on-surface"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Họ và tên *</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99] outline-none"
                        placeholder="VD: Nguyễn Văn A"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Email tài khoản *</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99] outline-none"
                        placeholder="VD: nv-a@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Mật khẩu ban đầu *</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99] outline-none"
                        placeholder="Ít nhất 6 ký tự"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Vai trò hệ thống</label>
                      <select
                        value={newRole}
                        onChange={e => setNewRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99] outline-none"
                      >
                        <option value="STAFF">Nhân viên văn phòng</option>
                        <option value="DRIVER">Tài xế giao hàng</option>
                        <option value="ACCOUNTANT">Kế toán</option>
                        <option value="ADMIN">Quản lý (Admin)</option>
                      </select>
                    </div>
                    <button
                      onClick={async () => {
                        if (!newName || !newEmail || !newPassword) {
                          toast({
                            type: 'error',
                            title: 'Thiếu thông tin',
                            message: 'Vui lòng nhập họ tên, email và mật khẩu',
                          });
                          return;
                        }
                        try {
                          const res = await fetch(API_ENDPOINTS.STAFF.BASE, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newName, email: newEmail, password: newPassword, role: newRole }),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            throw new Error(data.error ?? 'Không thể tạo nhân sự');
                          }
                          if (data.user) {
                            setStaffUsers(prev => [data.user, ...prev]);
                            setShowCreateModal(false);
                            setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('STAFF');
                            toast({ type: 'success', title: 'Đã tạo nhân sự thành công' });
                          }
                        } catch (err) {
                          console.error('Failed to create staff', err);
                          toast({
                            type: 'error',
                            title: 'Tạo nhân sự thất bại',
                            message: err instanceof Error ? err.message : 'Không thể tạo nhân sự',
                          });
                        }
                      }}
                      className="w-full py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors shadow-sm mt-2"
                    >
                      TẠO NHÂN SỰ MỚI
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <div className="rounded border border-outline-variant bg-card p-6 w-full max-w-md shadow-xl">
                  <div className="flex items-center justify-between mb-5 border-b border-outline-soft pb-3">
                    <h3 className="text-base font-bold text-on-surface">Đổi mật khẩu tài khoản</h3>
                    <button
                      onClick={() => { setShowPasswordModal(null); setPasswordInput(''); }}
                      className="text-faint hover:text-on-surface"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Mật khẩu mới *</label>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        className="w-full px-3 py-2 bg-card border border-outline-variant rounded text-sm text-on-surface focus:border-[#004a99] outline-none"
                        placeholder="Ít nhất 6 ký tự"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!passwordInput || passwordInput.length < 6) {
                          toast({
                            type: 'error',
                            title: 'Mật khẩu không hợp lệ',
                            message: 'Mật khẩu phải có ít nhất 6 ký tự',
                          });
                          return;
                        }
                        try {
                          const res = await fetch(API_ENDPOINTS.STAFF.DETAIL(showPasswordModal), {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: passwordInput }),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            throw new Error(data.error ?? 'Không thể cập nhật mật khẩu');
                          }
                          setShowPasswordModal(null);
                          setPasswordInput('');
                          toast({ type: 'success', title: 'Đã cập nhật mật khẩu' });
                        } catch (err) {
                          console.error('Failed to reset password', err);
                          toast({
                            type: 'error',
                            title: 'Đổi mật khẩu thất bại',
                            message: err instanceof Error ? err.message : 'Không thể cập nhật mật khẩu',
                          });
                        }
                      }}
                      className="w-full py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-colors shadow-sm mt-2"
                    >
                      LƯU MẬT KHẨU MỚI
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
