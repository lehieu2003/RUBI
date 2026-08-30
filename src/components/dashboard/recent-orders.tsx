'use client';

import { FileText, Printer, Clock, CheckCircle2, Truck, XCircle, Package } from 'lucide-react';

interface OrderItem {
  product: { name: string; sizeKg: number };
  quantity: number;
}

interface Order {
  id: string;
  code?: string;
  customer: { name: string; code: string };
  total: string | number;
  status: 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date | string;
  orderItems: OrderItem[];
}

interface RecentOrdersProps {
  orders: Order[];
  onPrint?: (orderId: string) => void;
}

const statusConfig = {
  PENDING: {
    label: 'Chờ giao',
    icon: Clock,
    color: 'bg-[#7f3700] text-white',
  },
  SHIPPING: {
    label: 'Đang giao',
    icon: Truck,
    color: 'bg-[#004a99] text-white',
  },
  DELIVERED: {
    label: 'Đã giao',
    icon: Package,
    color: 'bg-[#1b6d24] text-white',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    icon: CheckCircle2,
    color: 'bg-[#217128] text-white',
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: XCircle,
    color: 'bg-[#ba1a1a] text-white',
  },
};

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function RecentOrders({ orders, onPrint }: RecentOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-[#c2c6d3] rounded bg-white">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded bg-[#dee8ff] text-[#004a99]">
          <FileText className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-[#111c2d] mb-1">
          Hôm nay chưa có đơn hàng nào
        </h3>
        <p className="text-xs text-[#737783] max-w-sm">
          Hãy tạo đơn hàng mới từ thanh tác vụ nhanh để bắt đầu theo dõi!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border border-[#c2c6d3] bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-[#c2c6d3] bg-[#f0f3ff] px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#111c2d]">Đơn Hàng Gần Đây</h3>
          <p className="text-xs text-[#424751]">Danh sách đơn hàng phát sinh trong ca làm việc</p>
        </div>
        <span className="data-sm bg-[#dee8ff] text-[#00346f] px-2.5 py-1 rounded font-bold">
          {orders.length} Đơn
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-industrial">
          <thead>
            <tr className="border-b border-[#c2c6d3] bg-[#f9f9ff] text-[12px] font-bold uppercase tracking-wider text-[#424751]">
              <th className="py-3.5 px-4">Thời gian</th>
              <th className="py-3.5 px-4">Mã KH</th>
              <th className="py-3.5 px-4">Khách hàng</th>
              <th className="py-3.5 px-4">Chi tiết hàng</th>
              <th className="py-3.5 px-4 text-right">Tổng tiền</th>
              <th className="py-3.5 px-4 text-center">Trạng thái</th>
              <th className="py-3.5 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e7eeff] text-sm">
            {orders.slice(0, 10).map((order) => {
              const status = statusConfig[order.status] ?? statusConfig.PENDING;
              const StatusIcon = status.icon;
              return (
                <tr key={order.id} className="h-12 hover:bg-[#f0f3ff] transition-colors">
                  <td className="py-3 px-4 data-sm text-[#424751]">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="py-3 px-4 data-sm font-bold text-[#004a99]">
                    {order.customer.code}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#111c2d]">
                    {order.customer.name}
                  </td>
                  <td className="py-3 px-4 text-xs text-[#424751]">
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
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold ${status.color}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {onPrint && (
                      <button
                        onClick={() => onPrint(order.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#004a99] text-[#004a99] hover:bg-[#dee8ff] text-xs font-semibold transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        In K80
                      </button>
                    )}
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
