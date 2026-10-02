'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PrintSlip } from '@/components/order/print-slip';
import { ArrowLeft, Printer } from 'lucide-react';

export interface SerializedOrderDetail {
  id: string;
  code?: string | null;
  status: string;
  total: number;
  notes: string | null;
  createdAt: string;
  customer: {
    id: string;
    code: string;
    name: string;
    address: string;
    phone: string;
  };
  orderItems: {
    id: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: {
      id: string;
      name: string;
      sizeKg: number;
    };
  }[];
}

interface OrderDetailClientProps {
  order: SerializedOrderDetail;
}

export function OrderDetailClient({ order }: OrderDetailClientProps) {
  const [showPrintSlip, setShowPrintSlip] = useState(false);

  const handlePrint = () => {
    setShowPrintSlip(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const slipOrder = {
    id: order.id,
    code: order.code || `DH-${order.id.slice(-6).toUpperCase()}`,
    customer: order.customer,
    orderItems: order.orderItems.map((item) => ({
      product: { name: item.product.name, sizeKg: item.product.sizeKg },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    total: order.total,
    createdAt: order.createdAt,
  };

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    PENDING: { label: 'Chờ giao', bg: 'bg-container-high', text: 'text-primary-accent' },
    SHIPPING: { label: 'Đang giao', bg: 'bg-tertiary-fixed', text: 'text-tertiary-container' },
    DELIVERED: { label: 'Đã giao', bg: 'bg-[#a0f399]/40', text: 'text-secondary' },
    COMPLETED: { label: 'Hoàn thành', bg: 'bg-[#a0f399]/40', text: 'text-secondary' },
    CANCELLED: { label: 'Đã hủy', bg: 'bg-error-container', text: 'text-on-error-container' },
  };

  const currentStatus = statusConfig[order.status] || {
    label: order.status,
    bg: 'bg-container-high',
    text: 'text-primary-accent',
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header - hidden when printing */}
      <div className="print:hidden p-4 sm:p-6 lg:p-8 max-w-[1000px] mx-auto">
        {/* Back link */}
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-xs font-bold text-faint hover:text-primary-accent mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          QUAY LẠI DANH SÁCH
        </Link>

        {/* Page title row with Print button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-outline-variant pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Chi tiết đơn hàng</h1>
            <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-2">
              <span className="font-mono font-bold text-primary-accent">{slipOrder.code}</span>
              <span
                className={`inline-flex items-center rounded px-2.5 py-0.5 text-[11px] font-bold ${currentStatus.bg} ${currentStatus.text}`}
              >
                {currentStatus.label}
              </span>
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#004a99] text-white px-5 py-2.5 rounded font-bold text-xs hover:bg-[#00346f] transition-all shadow-sm"
          >
            <Printer className="h-4 w-4" />
            IN PHIẾU GIAO HÀNG (K80 / A5)
          </button>
        </div>

        {/* Order details card */}
        <div className="rounded border border-outline-variant bg-card p-6 shadow-sm space-y-6">
          {/* Customer info */}
          <div className="pb-6 border-b border-outline-soft">
            <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              Thông tin khách hàng
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-faint">Tên khách hàng</p>
                <p className="text-base font-bold text-on-surface">{order.customer.name}</p>
              </div>
              <div>
                <p className="text-xs text-faint">Mã đại lý</p>
                <p className="text-base font-mono font-bold text-primary-accent">{order.customer.code}</p>
              </div>
              <div>
                <p className="text-xs text-faint">Địa chỉ giao</p>
                <p className="text-sm text-on-surface font-medium">{order.customer.address}</p>
              </div>
              <div>
                <p className="text-xs text-faint">Số điện thoại</p>
                <p className="text-sm font-mono font-medium text-on-surface">{order.customer.phone}</p>
              </div>
            </div>
          </div>

          {/* Order items */}
          <div className="pb-6 border-b border-outline-soft">
            <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              Danh sách sản phẩm
            </h2>
            <table className="w-full text-left border-collapse table-industrial">
              <thead>
                <tr className="border-b border-outline-variant bg-surface text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="py-2.5 px-3">Sản phẩm</th>
                  <th className="py-2.5 px-3 text-center">Số lượng</th>
                  <th className="py-2.5 px-3 text-right">Đơn giá</th>
                  <th className="py-2.5 px-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-soft text-sm">
                {order.orderItems.map((item) => (
                  <tr key={item.id} className="h-11">
                    <td className="py-2.5 px-3 font-bold text-on-surface">
                      {item.product.name} ({item.product.sizeKg}kg)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-primary-accent">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right data-sm text-faint">
                      {item.unitPrice.toLocaleString('vi-VN')}đ
                    </td>
                    <td className="py-2.5 px-3 text-right data-md font-bold text-on-surface">
                      {item.lineTotal.toLocaleString('vi-VN')}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm font-bold text-on-surface-variant uppercase">Tổng tiền thanh toán</span>
            <span className="data-lg font-bold text-primary-accent">
              {order.total.toLocaleString('vi-VN')}đ
            </span>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="pt-4 border-t border-outline-soft">
              <p className="text-xs text-faint font-bold uppercase">Ghi chú giao hàng</p>
              <p className="text-sm text-on-surface mt-1 bg-surface p-3 rounded border border-outline-soft">
                {order.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Print-only content */}
      {showPrintSlip && (
        <div className="hidden print:block">
          <PrintSlip order={slipOrder} />
        </div>
      )}
    </div>
  );
}
