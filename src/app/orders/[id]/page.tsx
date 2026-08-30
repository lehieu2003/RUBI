'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PrintSlip } from '@/components/order/print-slip';
import { ArrowLeft, Printer, Loader2, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface OrderDetail {
  id: string;
  code?: string;
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

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPrintSlip, setShowPrintSlip] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`${API_ENDPOINTS.ORDERS.BASE}/${params.id}`);
        if (!res.ok) throw new Error('Không tìm thấy đơn hàng');
        const json = await res.json();
        const data = json?.data !== undefined ? json.data : json;
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tải đơn hàng');
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [params.id]);

  const handlePrint = () => {
    setShowPrintSlip(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#004a99]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center p-4">
        <div className="rounded border border-[#ba1a1a]/30 bg-[#ffdad6]/50 p-6 text-center max-w-md w-full">
          <AlertCircle className="h-8 w-8 text-[#ba1a1a] mx-auto mb-2" />
          <p className="text-[#93000a] font-bold text-sm">{error || 'Không tìm thấy đơn hàng'}</p>
          <Link href="/orders" className="mt-4 inline-block text-xs font-bold text-[#004a99] hover:underline">
            Quay lại danh sách đơn
          </Link>
        </div>
      </div>
    );
  }

  const slipOrder = {
    id: order.id,
    code: order.code || `DH-${order.id.slice(-6).toUpperCase()}`,
    customer: order.customer,
    orderItems: order.orderItems.map((item) => ({
      product: { name: item.product.name, sizeKg: item.product.sizeKg },
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
    total: Number(order.total),
    createdAt: order.createdAt,
  };

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    PENDING: { label: 'Chờ giao', bg: 'bg-[#dee8ff]', text: 'text-[#004a99]' },
    SHIPPING: { label: 'Đang giao', bg: 'bg-[#ffdcc2]', text: 'text-[#7f3700]' },
    DELIVERED: { label: 'Đã giao', bg: 'bg-[#a0f399]/40', text: 'text-[#1b6d24]' },
    COMPLETED: { label: 'Hoàn thành', bg: 'bg-[#a0f399]/40', text: 'text-[#1b6d24]' },
    CANCELLED: { label: 'Đã hủy', bg: 'bg-[#ffdad6]', text: 'text-[#93000a]' },
  };

  const currentStatus = statusConfig[order.status] || { label: order.status, bg: 'bg-[#dee8ff]', text: 'text-[#004a99]' };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d]">
      {/* Header - hidden when printing */}
      <div className="print:hidden p-4 sm:p-6 lg:p-8 max-w-[1000px] mx-auto">
        {/* Back link */}
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#737783] hover:text-[#004a99] mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          QUAY LẠI DANH SÁCH
        </Link>

        {/* Page title row with Print button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-[#c2c6d3] pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">Chi tiết đơn hàng</h1>
            <p className="text-xs text-[#424751] mt-1 flex items-center gap-2">
              <span className="font-mono font-bold text-[#004a99]">{slipOrder.code}</span>
              <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-[11px] font-bold ${currentStatus.bg} ${currentStatus.text}`}>
                {currentStatus.label}
              </span>
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#004a99] text-white px-5 py-2.5 rounded font-bold text-xs hover:bg-[#00346f] transition-all shadow-sm"
          >
            <Printer className="h-4 w-4" />
            IN PHIẾU GIAO HÀNG
          </button>
        </div>

        {/* Order details card */}
        <div className="rounded border border-[#c2c6d3] bg-white p-6 shadow-sm space-y-6">
          {/* Customer info */}
          <div className="pb-6 border-b border-[#e7eeff]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#424751] mb-3">Thông tin khách hàng</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#737783]">Tên khách hàng</p>
                <p className="text-base font-bold text-[#111c2d]">{order.customer.name}</p>
              </div>
              <div>
                <p className="text-xs text-[#737783]">Mã đại lý</p>
                <p className="text-base font-mono font-bold text-[#004a99]">{order.customer.code}</p>
              </div>
              <div>
                <p className="text-xs text-[#737783]">Địa chỉ giao</p>
                <p className="text-sm text-[#111c2d] font-medium">{order.customer.address}</p>
              </div>
              <div>
                <p className="text-xs text-[#737783]">Số điện thoại</p>
                <p className="text-sm font-mono font-medium text-[#111c2d]">{order.customer.phone}</p>
              </div>
            </div>
          </div>

          {/* Order items */}
          <div className="pb-6 border-b border-[#e7eeff]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#424751] mb-3">Danh sách sản phẩm</h2>
            <table className="w-full text-left border-collapse table-industrial">
              <thead>
                <tr className="border-b border-[#c2c6d3] bg-[#f9f9ff] text-[12px] font-bold uppercase tracking-wider text-[#424751]">
                  <th className="py-2.5 px-3">Sản phẩm</th>
                  <th className="py-2.5 px-3 text-center">Số lượng</th>
                  <th className="py-2.5 px-3 text-right">Đơn giá</th>
                  <th className="py-2.5 px-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7eeff] text-sm">
                {order.orderItems.map((item) => (
                  <tr key={item.id} className="h-11">
                    <td className="py-2.5 px-3 font-bold text-[#111c2d]">
                      {item.product.name} ({item.product.sizeKg}kg)
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-[#004a99]">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right data-sm text-[#737783]">
                      {Number(item.unitPrice).toLocaleString('vi-VN')}đ
                    </td>
                    <td className="py-2.5 px-3 text-right data-md font-bold text-[#111c2d]">
                      {Number(item.lineTotal).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm font-bold text-[#424751] uppercase">Tổng tiền thanh toán</span>
            <span className="data-lg font-bold text-[#004a99]">
              {Number(order.total).toLocaleString('vi-VN')}đ
            </span>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="pt-4 border-t border-[#e7eeff]">
              <p className="text-xs text-[#737783] font-bold uppercase">Ghi chú giao hàng</p>
              <p className="text-sm text-[#111c2d] mt-1 bg-[#f9f9ff] p-3 rounded border border-[#e7eeff]">{order.notes}</p>
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