'use client';
import { useEffect, useState } from 'react';
import { X, Building2, Truck, Calendar, ChevronRight } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface ImpersonationDrawerProps {
  factoryId: string;
  factoryName: string;
  onClose: () => void;
}

interface FactoryStats {
  factory: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    createdAt: string;
  };
  subscription: {
    id: string;
    planType: string;
    status: string;
    startDate: string;
    endDate: string;
    driverCount: number;
    pricePerDriver: number;
  } | null;
  activeDriverCount: number;
  totalOrders: number;
  pendingOrders: number;
}

export function ImpersonationDrawer({ factoryId, factoryName, onClose }: ImpersonationDrawerProps) {
  const [data, setData] = useState<FactoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_ENDPOINTS.ADMIN.FACTORY_DETAIL(factoryId))
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [factoryId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-white/10 z-50 shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-violet-500/10">
          <div>
            <p className="text-xs text-violet-400 font-medium">Đang xem với tư cách Super Admin</p>
            <h2 className="text-lg font-semibold text-slate-50">{factoryName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Subscription Info */}
              {data.subscription && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Thông tin subscription
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Gói</p>
                      <p className="text-sm font-medium text-slate-200">{data.subscription.planType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Trạng thái</p>
                      <p className="text-sm font-medium text-emerald-400">{data.subscription.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Bắt đầu</p>
                      <p className="text-sm text-slate-300">{formatDate(data.subscription.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Kết thúc</p>
                      <p className="text-sm text-slate-300">{formatDate(data.subscription.endDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Số tài xế</p>
                      <p className="text-sm text-slate-300">{data.subscription.driverCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Giá/tài xế</p>
                      <p className="text-sm text-slate-300">{formatCurrency(data.subscription.pricePerDriver)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Drivers */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Tài xế đang hoạt động
                </h3>
                <p className="text-2xl font-bold text-slate-50">{data.activeDriverCount}</p>
                <p className="text-xs text-slate-500 mt-1">tài xế active</p>
              </div>

              {/* Orders Summary */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Đơn hàng
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Tổng đơn</p>
                    <p className="text-xl font-bold text-slate-50">{data.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Đang xử lý</p>
                    <p className="text-xl font-bold text-amber-400">{data.pendingOrders}</p>
                  </div>
                </div>
              </div>

              {/* Factory Info */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Thông tin nhà máy</h3>
                <div className="space-y-2 text-sm">
                  {data.factory.phone && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Điện thoại</span>
                      <span className="text-slate-300">{data.factory.phone}</span>
                    </div>
                  )}
                  {data.factory.address && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Địa chỉ</span>
                      <span className="text-slate-300 text-right max-w-[200px]">{data.factory.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ngày đăng ký</span>
                    <span className="text-slate-300">{formatDate(data.factory.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Điều hướng nhanh</p>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`/dashboard?factoryId=${factoryId}`}
                    className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-slate-100 transition-colors text-sm"
                  >
                    <span>Đơn hàng</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </a>
                  <a
                    href={`/drivers?factoryId=${factoryId}`}
                    className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-slate-100 transition-colors text-sm"
                  >
                    <span>Tài xế</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </a>
                  <a
                    href={`/products?factoryId=${factoryId}`}
                    className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-slate-100 transition-colors text-sm"
                  >
                    <span>Sản phẩm</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </a>
                  <a
                    href={`/customers?factoryId=${factoryId}`}
                    className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-slate-100 transition-colors text-sm"
                  >
                    <span>Khách hàng</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </a>
                </div>
              </div>

              {/* End Button */}
              <button
                onClick={onClose}
                className="w-full py-3 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors font-medium"
              >
                Kết thúc phiên xem
              </button>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-12">Không thể tải dữ liệu</p>
          )}
        </div>
      </div>
    </>
  );
}