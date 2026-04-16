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
    color: 'text-slate-400 bg-slate-500/20',
  },
  SHIPPING: {
    label: 'Đang giao',
    icon: Truck,
    color: 'text-amber-400 bg-amber-500/20',
  },
  DELIVERED: {
    label: 'Đã giao',
    icon: Package,
    color: 'text-blue-400 bg-blue-500/20',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    icon: CheckCircle2,
    color: 'text-emerald-400 bg-emerald-500/20',
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: XCircle,
    color: 'text-red-400 bg-red-500/20',
  },
};

function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function RecentOrders({ orders, onPrint }: RecentOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        {/* Empty state illustration */}
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20">
          <svg
            viewBox="0 0 64 64"
            className="h-16 w-16 text-blue-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {/* Ice bag illustration */}
            <path d="M32 8L20 20v24l12 12 12-12V20L32 8z" />
            <path d="M32 8v36M20 20l12 12 12-12" />
            <circle cx="32" cy="32" r="4" fill="currentColor" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Hôm nay chưa có đơn hàng nào
        </h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Hãy bấm nút "Lên đơn mới" để tạo đơn hàng đầu tiên trong ngày!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Đơn hàng gần đây</h3>
            <p className="text-sm text-slate-400">10 đơn hàng mới nhất</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mã đơn
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Khách hàng
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Sản phẩm
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tổng tiền
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Giờ
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;
              const total =
                typeof order.total === 'string'
                  ? parseFloat(order.total)
                  : order.total;

              return (
                <tr
                  key={order.id}
                  className="transition-colors hover:bg-white/5"
                >
                  {/* Order code */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="text-sm font-mono font-semibold text-blue-400">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                  </td>

                  {/* Customer */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white">
                        {order.customer.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {order.customer.code}
                      </span>
                    </div>
                  </td>

                  {/* Products */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {order.orderItems.slice(0, 2).map((item, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300"
                        >
                          {item.product.name} {item.product.sizeKg}kg ×
                          {item.quantity}
                        </span>
                      ))}
                      {order.orderItems.length > 2 && (
                        <span className="inline-flex items-center rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400">
                          +{order.orderItems.length - 2}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Total */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="text-sm font-bold text-emerald-400">
                      {total.toLocaleString('vi-VN')}đ
                    </span>
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.color}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                  </td>

                  {/* Time */}
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="text-sm text-slate-400">
                      {formatDate(order.createdAt)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button
                      onClick={() => onPrint?.(order.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-600 hover:text-white"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      In lại
                    </button>
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
