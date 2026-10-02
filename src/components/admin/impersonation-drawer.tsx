'use client';
import { useEffect, useState } from 'react';
import { X, Building2, Truck, Calendar, ChevronRight, Loader2 } from 'lucide-react';
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
        const payload = d?.data !== undefined ? d.data : d;
        setData(payload);
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
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-outline-variant z-50 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#002754] bg-[#00346f] text-white">
          <div>
            <p className="text-xs text-[#9bbdff] font-bold uppercase tracking-wider">Phiên hỗ trợ Super Admin</p>
            <h2 className="text-base font-bold text-white mt-0.5">{factoryName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-[#004a99] hover:bg-[#002754] text-white transition-colors"
            aria-label="Đóng phiên hỗ trợ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-surface">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary-accent" />
            </div>
          ) : data ? (
            <div className="space-y-5">
              {/* Subscription Info */}
              {data.subscription && (
                <div className="bg-card rounded border border-outline-variant p-4 shadow-2xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-primary-accent" />
                    Thông tin gói thuê bao
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-faint">Gói</p>
                      <p className="font-bold text-on-surface">{data.subscription.planType}</p>
                    </div>
                    <div>
                      <p className="text-faint">Trạng thái</p>
                      <p className="font-bold text-secondary">{data.subscription.status}</p>
                    </div>
                    <div>
                      <p className="text-faint">Bắt đầu</p>
                      <p className="text-on-surface">{formatDate(data.subscription.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-faint">Kết thúc</p>
                      <p className="text-on-surface">{formatDate(data.subscription.endDate)}</p>
                    </div>
                    <div>
                      <p className="text-faint">Số tài xế</p>
                      <p className="font-bold text-primary-accent">{data.subscription.driverCount}</p>
                    </div>
                    <div>
                      <p className="text-faint">Giá/tài xế</p>
                      <p className="font-bold text-on-surface">{formatCurrency(data.subscription.pricePerDriver)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Drivers & Orders */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card rounded border border-outline-variant p-3 shadow-2xs">
                  <h3 className="text-[11px] font-bold uppercase text-on-surface-variant mb-1 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-primary-accent" />
                    Tài xế active
                  </h3>
                  <p className="data-lg font-bold text-primary-accent">{data.activeDriverCount}</p>
                </div>
                <div className="bg-card rounded border border-outline-variant p-3 shadow-2xs">
                  <h3 className="text-[11px] font-bold uppercase text-on-surface-variant mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-tertiary-container" />
                    Đang xử lý
                  </h3>
                  <p className="data-lg font-bold text-tertiary-container">{data.pendingOrders}</p>
                </div>
              </div>

              {/* Factory Info */}
              <div className="bg-card rounded border border-outline-variant p-4 shadow-2xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2.5">Hồ sơ nhà máy</h3>
                <div className="space-y-2 text-xs">
                  {data.factory.phone && (
                    <div className="flex justify-between">
                      <span className="text-faint">Điện thoại</span>
                      <span className="font-mono font-bold text-on-surface">{data.factory.phone}</span>
                    </div>
                  )}
                  {data.factory.address && (
                    <div className="flex justify-between">
                      <span className="text-faint">Địa chỉ</span>
                      <span className="text-on-surface text-right max-w-[200px]">{data.factory.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-faint">Ngày tạo</span>
                    <span className="text-on-surface">{formatDate(data.factory.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Truy cập nhanh dữ liệu nhà máy</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a
                    href={`/orders?factoryId=${factoryId}`}
                    className="flex items-center justify-between px-3 py-2.5 bg-card border border-outline-variant rounded font-bold text-primary-accent hover:bg-container-high transition-colors"
                  >
                    <span>Đơn hàng</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                  <a
                    href={`/settings?factoryId=${factoryId}`}
                    className="flex items-center justify-between px-3 py-2.5 bg-card border border-outline-variant rounded font-bold text-primary-accent hover:bg-container-high transition-colors"
                  >
                    <span>Nhân sự</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                  <a
                    href={`/inventory?factoryId=${factoryId}`}
                    className="flex items-center justify-between px-3 py-2.5 bg-card border border-outline-variant rounded font-bold text-primary-accent hover:bg-container-high transition-colors"
                  >
                    <span>Kho hàng</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                  <a
                    href={`/customers?factoryId=${factoryId}`}
                    className="flex items-center justify-between px-3 py-2.5 bg-card border border-outline-variant rounded font-bold text-primary-accent hover:bg-container-high transition-colors"
                  >
                    <span>Khách hàng</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* End Button */}
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-[#ba1a1a] hover:bg-[#93000a] text-white rounded font-bold text-xs shadow-2xs transition-colors mt-2"
              >
                KẾT THÚC PHIÊN HỖ TRỢ
              </button>
            </div>
          ) : (
            <p className="text-xs text-faint text-center py-12">Không thể tải thông tin nhà máy</p>
          )}
        </div>
      </div>
    </>
  );
}