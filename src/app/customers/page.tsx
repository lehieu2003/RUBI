'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Search, Plus, Phone, MapPin, DollarSign, Package, ChevronRight, X } from 'lucide-react';
import { toast } from '@/components/dashboard/toast';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface Customer {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

interface CustomerDetail extends Customer {
  debt?: number;
  bagsOwed?: number;
}

interface Product {
  id: string;
  name: string;
  sizeKg: number;
  price: number;
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', phone: '', address: '', isActive: true });
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch(API_ENDPOINTS.CUSTOMERS.BASE);
      if (!res.ok) throw new Error('Failed to load customers');
      const json = await res.json();
      return json?.data !== undefined ? json.data : json;
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch(API_ENDPOINTS.PRODUCTS.BASE);
      if (!res.ok) throw new Error('Failed to load products');
      const json = await res.json();
      return json?.data !== undefined ? json.data : json;
    },
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (newCustomerData: typeof formData) => {
      const res = await fetch(API_ENDPOINTS.CUSTOMERS.BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomerData),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      setFormData({ code: '', name: '', phone: '', address: '', isActive: true });
      toast({ type: 'success', title: 'Đã thêm khách hàng' });
    },
    onError: () => {
      toast({ type: 'error', title: 'Lỗi', message: 'Không thể tạo khách hàng' });
    },
  });

  const handleAddCustomer = async () => {
    if (!formData.code || !formData.name) {
      toast({ type: 'error', title: 'Vui lòng nhập mã và tên khách hàng' });
      return;
    }
    addCustomerMutation.mutate(formData);
  };

  const loading = customersLoading;
  const submitting = addCustomerMutation.isPending;

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const handlePriceChange = (productId: string, value: string) => {
    setEditingPrices((prev) => ({ ...prev, [productId]: value }));
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d]">
      <Sidebar />

      <main className="pl-64">
        <div className="p-8 max-w-[1400px]">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c2c6d3] pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">Danh Sách Khách Hàng</h1>
              <p className="text-xs text-[#424751] mt-1">{customers.length} đại lý / khách hàng trong hệ thống</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              THÊM KHÁCH HÀNG
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737783]" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT hoặc mã KH..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#c2c6d3] rounded text-sm text-[#111c2d] placeholder-[#737783] focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99]"
            />
          </div>

          {/* Customer List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-[#004a99] border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className="group cursor-pointer rounded border border-[#c2c6d3] bg-white p-4 hover:border-[#004a99] hover:bg-[#f0f3ff] transition-all shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-[#004a99] bg-[#dee8ff] px-2 py-0.5 rounded">
                          {customer.code}
                        </span>
                        {!customer.isActive && (
                          <span className="text-xs font-mono text-[#737783] bg-[#cfdaf2] px-2 py-0.5 rounded">
                            inactive
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#737783] group-hover:text-[#004a99] transition-colors" />
                    </div>
                    <h3 className="text-base font-bold text-[#111c2d] mb-2">{customer.name}</h3>
                  </div>

                  <div className="space-y-1.5 border-t border-[#e7eeff] pt-2 text-xs text-[#424751]">
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-[#737783]" />
                      <span className="font-mono font-medium">{customer.phone || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-[#737783] shrink-0" />
                      <span className="truncate">{customer.address || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white border border-[#c2c6d3] rounded shadow-xl p-6">
            <h3 className="text-lg font-bold text-[#111c2d] mb-1">Thêm khách hàng</h3>
            <p className="text-[#424751] text-xs mb-5">Tạo thông tin đại lý hoặc khách lấy đá mới</p>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#424751] mb-1">Mã khách hàng *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-[#c2c6d3] rounded text-sm text-[#111c2d] focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99]"
                  placeholder="KH001"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#424751] mb-1">Tên khách hàng *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-[#c2c6d3] rounded text-sm text-[#111c2d] focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99]"
                  placeholder="Đại lý Minh Tuấn"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#424751] mb-1">Số điện thoại</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-[#c2c6d3] rounded text-sm text-[#111c2d] focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99]"
                  placeholder="0909123456"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#424751] mb-1">Địa chỉ giao hàng</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-[#c2c6d3] rounded text-sm text-[#111c2d] focus:border-[#004a99] focus:outline-none focus:ring-1 focus:ring-[#004a99]"
                  placeholder="123 Lê Lợi, Quận 1"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-[#c2c6d3] text-[#004a99] focus:ring-[#004a99]"
                />
                <label htmlFor="isActive" className="text-xs font-medium text-[#111c2d]">Kích hoạt ngay</label>
              </div>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 border border-[#c2c6d3] text-[#424751] font-bold text-xs rounded hover:bg-[#dee8ff] transition-colors"
              >
                HỦY
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={submitting}
                className="flex-1 py-2.5 bg-[#004a99] hover:bg-[#00346f] disabled:bg-slate-300 text-white font-bold text-xs rounded transition-colors shadow-sm"
              >
                {submitting ? 'Đang lưu...' : 'XÁC NHẬN'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setSelectedCustomer(null)} />
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-white border-l border-[#c2c6d3] shadow-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#f9f9ff] border-b border-[#c2c6d3]">
              <div>
                <span className="text-xs font-bold font-mono text-[#004a99] bg-[#dee8ff] px-2 py-0.5 rounded">
                  {selectedCustomer.code}
                </span>
                <h2 className="text-lg font-bold text-[#111c2d] mt-1">{selectedCustomer.name}</h2>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded hover:bg-[#dee8ff] text-[#737783] hover:text-[#111c2d] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Contact Info */}
              <div className="rounded border border-[#c2c6d3] bg-[#f9f9ff] p-4">
                <h3 className="text-xs font-bold text-[#424751] uppercase tracking-wider mb-3">Thông tin liên hệ</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-[#737783]" />
                    <span className="text-[#111c2d] font-mono font-medium">{selectedCustomer.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-4 w-4 text-[#737783]" />
                    <span className="text-[#111c2d]">{selectedCustomer.address || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

