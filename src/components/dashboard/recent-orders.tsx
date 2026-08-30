'use client';

import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Package,
  Eye,
} from 'lucide-react';

interface OrderItem {
  id?: string;
  product: { name: string; sizeKg: number };
  quantity: number;
  unitPrice?: number | string;
  lineTotal?: number | string;
}

interface Order {
  id: string;
  code?: string;
  customer: { id?: string; name: string; code: string; address?: string; phone?: string };
  total: string | number;
  status: 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date | string;
  orderItems: OrderItem[];
}

interface RecentOrdersProps {
  orders: Order[];
}

const statusConfig = {
  PENDING: {
    label: 'Chờ giao',
    icon: Clock,
    badgeBg: 'bg-[#dee8ff]',
    badgeText: 'text-[#004a99]',
  },
  SHIPPING: {
    label: 'Đang giao',
    icon: Truck,
    badgeBg: 'bg-[#ffdcc2]',
    badgeText: 'text-[#7f3700]',
  },
  DELIVERED: {
    label: 'Đã giao',
    icon: Package,
    badgeBg: 'bg-[#a0f399]/40',
    badgeText: 'text-[#1b6d24]',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    icon: CheckCircle2,
    badgeBg: 'bg-[#a0f399]/40',
    badgeText: 'text-[#1b6d24]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: XCircle,
    badgeBg: 'bg-[#ffdad6]',
    badgeText: 'text-[#93000a]',
  },
};

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-[#c2c6d3] rounded bg-white shadow-xs">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded bg-[#dee8ff] text-[#004a99]">
          <FileText className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-[#111c2d] mb-1">
          Hôm nay chưa có đơn hàng nào
        </h3>
        <p className="text-xs text-[#737783] max-w-sm">
          Nhấn <strong>F2</strong> hoặc nút <strong>Lên Đơn Nhanh</strong> để tạo đơn hàng mới cho xưởng!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border border-[#c2c6d3] bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-[#c2c6d3] bg-[#f0f3ff] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-[#002754]">Đơn Hàng Gần Đây</h3>
          <p className="text-xs text-[#424751]">Danh sách đơn hàng phát sinh trong ca làm việc hôm nay</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="data-sm bg-[#dee8ff] text-[#00346f] px-2.5 py-1 rounded font-bold">
            {orders.length} Đơn hàng
          </span>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#004a99] hover:text-[#00346f] hover:underline"
          >
            Xem tất cả &rarr;
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-industrial">
          <thead>
            <tr className="border-b border-[#c2c6d3] bg-[#f9f9ff] text-[12px] font-bold uppercase tracking-wider text-[#424751]">
              <th className="py-3 px-4">Thời gian</th>
              <th className="py-3 px-4">Mã KH</th>
              <th className="py-3 px-4">Khách hàng</th>
              <th className="py-3 px-4">Chi tiết hàng</th>
              <th className="py-3 px-4 text-right">Tổng tiền</th>
              <th className="py-3 px-4 text-center">Trạng thái</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e7eeff] text-sm">
            {orders.slice(0, 15).map((order) => {
              const status = statusConfig[order.status] ?? statusConfig.PENDING;
              const StatusIcon = status.icon;

              return (
                <tr key={order.id} className="h-12 hover:bg-[#f0f3ff] transition-colors group">
                  <td className="py-3 px-4 data-sm text-[#424751]">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="py-3 px-4 data-sm font-bold text-[#004a99]">
                    {order.customer.code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#111c2d]">
                    {order.customer.name}
                  </td>
                  <td className="py-3 px-4 text-xs text-[#424751] max-w-[260px] truncate">
                    {order.orderItems
                      ?.map(
                        (i) =>
                          `${i.product.name} ${i.product.sizeKg}kg × ${i.quantity}`
                      )
                      .join(', ')}
                  </td>
                  <td className="py-3 px-4 text-right data-md font-bold text-[#111c2d]">
                    {Number(order.total).toLocaleString('vi-VN')}đ
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold ${status.badgeBg} ${status.badgeText}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </td>

                  {/* Action Column - Only View */}
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-[#c2c6d3] bg-white hover:bg-[#dee8ff] text-[#424751] hover:text-[#004a99] hover:border-[#004a99] text-xs font-bold transition-all shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#004a99]" />
                      <span>Xem</span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
